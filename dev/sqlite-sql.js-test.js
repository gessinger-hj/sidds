#!/usr/bin/env node

/* 
* @Author: Hans J�rgen Gessinger
* @Date:   2016-02-09 19:42:51
* @Last Modified by:   hg02055
* @Last Modified time: 2016-02-10 17:53:11
* File-name: sqlite-sql.js-test
*/

'use strict';
var T = require ( "gepard" ) ;
var L = require ( "gepard" ).LogFile ;
var fs = require('fs');
var SQL = require('sql.js');
var filebuffer = fs.readFileSync ( 'sidds.db' ) ;
var db = new SQL.Database(filebuffer);
var res = db.exec ( "SELECT * FROM T_IDENTITY" ) ;

// console.log ( res[0] ) ;
// db.close();