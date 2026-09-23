import {neon} from '@neondatabase/serverless';
import {put,del} from '@vercel/blob';
export function bindings(env) {
  if (!env.DATABASE_URL) throw new Error('Database not configured');
  const sql = neon(env.DATABASE_URL);
  return {
    DB: {
      prepare(statement) {
        let i=0;
        let query=statement.replace(/\?/g,()=>'$'+(++i));
        if(query.startsWith('INSERT OR IGNORE')) query=query.replace('INSERT OR IGNORE','INSERT')+' ON CONFLICT (id) DO NOTHING';
        return {
          params:[],
          bind(...params){this.params=params;return this},
          async all(){return {results:await sql.query(query,this.params)}},
          async run(){const r=await sql.query(query,this.params,{fullResults:true});return {meta:{changes:r.rowCount}}}
        };
      }
    },
    BUCKET: {
      async put(id,bytes,options){return put('uploads/'+id,bytes,{access:'public',addRandomSuffix:false,contentType:options.httpMetadata.contentType,token:env.BLOB_READ_WRITE_TOKEN})},
      async delete(url){return del(url,{token:env.BLOB_READ_WRITE_TOKEN})}
    },
    ASSETS:{fetch(){return new Response('Not found',{status:404})}},
    sql
  };
}
