import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {loginClientKey,reserveLoginAttempt,clearLoginAttempts,LOGIN_WINDOW} from '../lib/login-limit.mjs';
const config={VERCEL:'1',SESSION_SECRET:'test-only-secret-'.repeat(4)};
const req=ip=>new Request('https://portfolio.test/api/auth/login',{headers:{'x-vercel-forwarded-for':ip}});
test('blocked clients are isolated; expiry and reset are scoped',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE login_attempts (id TEXT PRIMARY KEY,attempts INTEGER NOT NULL,window_start BIGINT NOT NULL)');
 const sql={query:async(q,args)=>db.prepare(q).all(Object.fromEntries(args.map((v,i)=>["$"+(i+1),v])))};
 try{
 const a=loginClientKey(req('192.0.2.1'),config),b=loginClientKey(req('192.0.2.2'),config),now=1000000;
 for(let i=0;i<10;i++)assert.equal((await reserveLoginAttempt(sql,a,now)).allowed,true);
 assert.deepEqual(await reserveLoginAttempt(sql,a,now),{allowed:false,retryAfter:900});
 assert.equal((await reserveLoginAttempt(sql,b,now)).allowed,true);
 await clearLoginAttempts(sql,b);
 assert.equal((await reserveLoginAttempt(sql,a,now+1000)).allowed,false);
 assert.equal((await reserveLoginAttempt(sql,b,now+1000)).allowed,true);
 assert.equal((await reserveLoginAttempt(sql,a,now+LOGIN_WINDOW)).allowed,true);
 await clearLoginAttempts(sql,a);
 assert.equal((await reserveLoginAttempt(sql,a,now+LOGIN_WINDOW)).allowed,true);
 }finally{db.close();}
});
test('trusted header required; IPv6 addresses grouped and IPv4-mapped addresses normalized',()=>{
 const a=loginClientKey(req('192.0.2.1'),config);
 assert.match(a,/^login:[a-f0-9]{64}$/);
 assert.equal(a,loginClientKey(req('::ffff:192.0.2.1'),config));
 assert.equal(loginClientKey(req('2001:db8:0:1::1'),config),loginClientKey(req('2001:0db8:0000:0001::abcd'),config));
 assert.notEqual(loginClientKey(req('2001:db8:0:1::1'),config),loginClientKey(req('2001:db8:0:2::1'),config));
 assert.throws(()=>loginClientKey(new Request('https://portfolio.test',{headers:{'x-forwarded-for':'192.0.2.1'}}),config));
 assert.throws(()=>loginClientKey(req('192.0.2.1, 192.0.2.2'),config));
 assert.equal(loginClientKey(req('192.0.2.1'),{...config,VERCEL:'0'}),loginClientKey(req('192.0.2.2'),{...config,VERCEL:'0'}));
});
