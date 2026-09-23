import {randomBytes} from 'node:crypto';import {spawnSync} from 'node:child_process';import {hashPassword} from '../lib/auth.mjs';
const password=randomBytes(18).toString('base64url');const hash=await hashPassword(password);const cli=new URL('../node_modules/vercel/dist/index.js',import.meta.url);const {fileURLToPath}=await import('node:url');
for(const [key,value] of Object.entries({ADMIN_PASSWORD_HASH:hash,SESSION_SECRET:randomBytes(48).toString('base64url'),EDITOR_EMAIL:'mir1sahin123@gmail.com'})){
 const r=spawnSync(process.execPath,[fileURLToPath(cli),'env','add',key,'production','--force','--yes'],{input:value+'\n',encoding:'utf8'});
 if(r.status!==0){console.error(r.stderr||r.stdout);throw new Error('Could not configure '+key+'. Sign in and link the Vercel project first.')}
}
console.log('\nEditor email: mir1sahin123@gmail.com\nYour NEW editor password (save it in your password manager):\n'+password+'\n\nDeploy after this step. Running this command again resets the password and signs out existing editor sessions.');
