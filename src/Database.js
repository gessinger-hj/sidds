var gepard = require ( "gepard" ) ;
var wait = require ( "wait.for" ) ;

var Database = function ( url )
{
  this.url = url ;
  if ( this.url.toUpperCase().indexOf ( "MYSQL" ) >= 0 )
  {
    this._MYSQL = true ;
  }
  else
  if ( this.url.toUpperCase().indexOf ( "SQLITE" ) >= 0 )
  {
    this._SQLITE = true ;
  }
  else
  if ( this.url.toUpperCase().indexOf ( "POSTGRES" ) >= 0 )
  {
    this._POSTGRES = true ;
  }
  else
  {
    throw new Error ( "Not a valid url: " + this.url ) ;
  }
};
Database.prototype.toString = function()
{
  return "(Database)[url=" + this.url + "]" ;
};
Database.prototype.getConnection = function()
{
  return this._getConnection() ;
};
Database.prototype._getConnection = function()
{
  if ( this.connection )
  {
    return this.connection ;
  }
  if ( this._MYSQL )
  {
    var mysql =  require('mysql');
    if ( ! this.pool )
    {
      this.pool = mysql.createPool ( this.url )
      this.pool.conn = function ( stdCallback )
      { 
        this.getConnection ( function ( err, connection )
        { 
          return stdCallback ( err, { err:err, connection:connection } ) ; 
        });
      };
    }
    var response = wait.forMethod ( this.pool, "conn" ) ;
    this.connection = response.connection ;
    if ( response.err )
    {
      this.connection.destroy() ;
      this.connection = null ;
      this.pool.end ( function(err)
      {
        console.log ( err ) ;
      });
      this.pool = null ;
      throw new Error ( response.err ) ;
      return ;
    }
    this.connection.connect();
    this.connection.q = function ( _sql, params, stdCallback )
    { 
      this.query ( _sql, params, function(err,rows,columns)
      { 
        return stdCallback(err,{rows:rows,columns:columns}); 
      });
    };
  }
  else
  if ( this._SQLITE )
  {
    this._SYSDATE = "CURRENT_TIMESTAMP" ;
    this._UNIQUE = "DISTINCT" ;
    var sql = require('sql.js');
    this.file = this.url.substring ( this.url.indexOf ( ':' ) + 1 ) ;
    var fs = require('fs');
    var fileExists = false ;
    try
    {
      fs.statSync ( this.file ) ;
      fileExists = true ;
    }
    catch ( exc )
    {
      console.log ( exc ) ;
    }
    if ( fileExists )
    {
      var filebuffer = fs.readFileSync ( this.file ) ;
      this.connection = new sql.Database ( filebuffer ) ;
    }
    else
    {
      this.connection = new sql.Database() ;
    }
  }
  else
  if ( this._POSTGRES )
  {
    this.pg = require('pg');
    this.pg.conn = function ( url, stdCallback )
    { 
      this.connect ( url, function ( err, client, done )
      { 
        return stdCallback ( err, { err:err, connection:client } ) ; 
      });
    };
    var response = wait.forMethod ( this.pg, "conn", this.url ) ;
    this.connection = response.connection ;
    if ( response.err )
    {
      var pool = this.pg.pools.getOrCreate()
      pool.destroy ( this.connection ) ;
      throw new Error ( response.err ) ;
      return ;
    }
    this.connection.q = function ( _sql, params, stdCallback )
    {
      if ( typeof params === 'function' )
      {
        stdCallback = params ;
        this.query ( _sql, function ( err, result )
        {
          return stdCallback ( err, { err:err, result:result } ) ; 
        });
      }
      else
      {
        this.query ( _sql, params, function ( err, result )
        { 
          return stdCallback ( err, { err:err, result:result } ) ; 
        });
      }
    };
  }
  return this.connection ;
};
Database.prototype.close = function()
{
  if ( this._SQLITE )
  {
  }
  if ( this._MYSQL )
  {
    if ( this.connection )
    {
      delete this.connection["q"] ;
      this.connection.release() ;
    }
  }
  if ( this._POSTGRES )
  {
    delete this.connection["q"] ;
    var pool = this.pg.pools.getOrCreate() ;
    pool.release ( this.connection ) ;
  }
  this.connection = null ;
};
Database.prototype.disconnect = function()
{
  if ( this._SQLITE )
  {
    if ( this.connection && this.hasChanged )
    {
      var fs = require ( 'fs' ) ;
      var data = db.export() ;
      var buffer = new Buffer ( data ) ;
      fs.writeFileSync( this.file, buffer ) ;
    }
    if ( this.connection ) this.connection.close() ;
  }
  if ( this._MYSQL )
  {
    if ( this.connection )
    {

      this.connection.destroy() ;
      this.connection = null ;
      this.pool.end ( function(err)
      {
        if ( err )
        {
          console.log ( err ) ;
        }
      });
      this.pool = null ;
    }
  }
  if ( this._POSTGRES )
  {
    var pool = this.pg.pools.getOrCreate() ;
    if ( this.connection )
    {
      delete this.connection["q"] ;
      pool.release ( this.connection ) ;
    }
    pool.destroyAllNow() ;
  }
  this.connection = null ;
};
Database.prototype.select = function ( sql, hostVars )
{
  var result ;
  if ( this._MYSQL )
  {
  // result.insertId, TODO for mySQL
    result = wait.forMethod( this.connection, "q", sql, hostVars ); 
    return result.rows ;
  }
  else
  if ( this._SQLITE )
  {
    var stmt = this.connection.prepare ( sql, hostVars ) ;
    result = [] ;
    while ( stmt.step() )
    {
      result.push ( stmt.getAsObject() ) ;
    }
    return result
  }
  else
  if ( this._POSTGRES )
  {
    var sql1 = sql ;
    for ( var i = 1 ; i < 100 ; i++ )
    {
      if ( sql1.indexOf ( '?' ) < 0 ) break ;
      sql1 = sql1.replace ( /\?/g, "$" + i ) ;
    }
    var response = wait.forMethod ( this.connection, "q", sql1, hostVars ) ;
    if ( response.err )
    {
      console.log ( err ) ;
      delete connection["q"] ;
      var pool = this.pg.getOrCreate() ;
      pool.destroy ( connection ) ;
      return ;
    }
    return response.result.rows ; //.rows[0]);
  }
};

module.exports = Database ;