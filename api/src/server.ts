import {createServer,IncomingMessage,ServerResponse} from 'node:http'
import {loadEnvFile} from 'node:process'
import {createClient,User} from '@supabase/supabase-js'

try{loadEnvFile(new URL('../../.env',import.meta.url))}catch{}

type Json=Record<string,unknown>
type Role='owner'|'editor'|'viewer'
type Workspace={id:string;name:string;slug:string}
type Membership={workspace_id:string;role:Role;workspaces:Workspace}

const port=8787
const supabaseUrl=process.env.SUPABASE_URL
const supabaseSecretKey=process.env.SUPABASE_SECRET_KEY
if(!supabaseUrl||!supabaseSecretKey)throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required')

const admin=createClient(supabaseUrl,supabaseSecretKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})

function reply(res:ServerResponse,status:number,body:unknown){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body))}
function fail(res:ServerResponse,status:number,message:string){reply(res,status,{error:message})}
async function body(req:IncomingMessage):Promise<Json>{const chunks:Buffer[]=[];for await(const chunk of req){chunks.push(Buffer.from(chunk));if(chunks.reduce((sum,item)=>sum+item.length,0)>2_000_000)throw new Error('Request body is too large')}if(!chunks.length)return{};return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Json}
function bearer(req:IncomingMessage){const value=req.headers.authorization||'';return value.startsWith('Bearer ')?value.slice(7):''}
async function authenticated(req:IncomingMessage){const token=bearer(req);if(!token)return null;const {data,error}=await admin.auth.getUser(token);if(error||!data.user)return null;return data.user}
function slug(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'folion-workspace'}

async function memberships(userId:string){const {data,error}=await admin.from('workspace_members').select('workspace_id,role,workspaces!inner(id,name,slug)').eq('user_id',userId);if(error)throw error;return(data||[]) as unknown as Membership[]}
async function ensureWorkspace(user:User):Promise<{workspace:Workspace;role:Role}>{
 await admin.from('profiles').upsert({id:user.id,email:user.email||'',display_name:user.user_metadata?.display_name||user.email?.split('@')[0]||''})
 const existing=await memberships(user.id)
 if(existing[0])return{workspace:existing[0].workspaces,role:existing[0].role}
 const name='Folion Workspace';const workspaceSlug=`${slug(name)}-${user.id.slice(0,8)}`
 let {data:workspace,error}=await admin.from('workspaces').insert({name,slug:workspaceSlug,created_by:user.id}).select('id,name,slug').single();if(error?.code==='23505'){const existingWorkspace=await admin.from('workspaces').select('id,name,slug').eq('slug',workspaceSlug).single();workspace=existingWorkspace.data;error=existingWorkspace.error}if(error||!workspace)throw error||new Error('Unable to create workspace')
 const {error:memberError}=await admin.from('workspace_members').upsert({workspace_id:workspace.id,user_id:user.id,role:'owner',invited_email:user.email||'',accepted_at:new Date().toISOString()},{onConflict:'workspace_id,user_id'});if(memberError)throw memberError
 await audit(workspace.id,user.id,'workspace.created','workspace',workspace.id,{})
 return{workspace:workspace as Workspace,role:'owner'}
}
async function membership(userId:string,workspaceId:string){const all=await memberships(userId);const member=all.find(item=>item.workspace_id===workspaceId);return member?{workspace:member.workspaces,role:member.role}:null}
async function requireRole(user:User,workspaceId:string,allowed:Role[]){const member=await membership(user.id,workspaceId);if(!member||!allowed.includes(member.role))throw Object.assign(new Error('You do not have permission for this workspace'),{status:403});return member}
async function audit(workspaceId:string,userId:string,action:string,entityType:string,entityId:string|null,metadata:Json){await admin.from('audit_events').insert({workspace_id:workspaceId,actor_user_id:userId,action,entity_type:entityType,entity_id:entityId,metadata})}

function assetRow(workspaceId:string,projectId:string,userId:string,asset:Json,storagePath?:string){const durablePath=storagePath||asset.storagePath||null;return{workspace_id:workspaceId,project_id:projectId,id:String(asset.id||crypto.randomUUID()),type:String(asset.type||'other'),title:String(asset.title||''),caption:String(asset.caption||''),storage_path:durablePath,source_url:!durablePath&&typeof asset.url==='string'&&!asset.url.startsWith('blob:')?asset.url:null,source_page:typeof asset.sourcePage==='number'?asset.sourcePage:null,tags:Array.isArray(asset.tags)?asset.tags:[],uploaded_category:String(asset.uploadedCategory||asset.type||''),is_primary:Boolean(asset.isPrimary),is_selected_for_gallery:asset.isSelectedForGallery!==false,created_by:userId}}

async function saveProject(workspaceId:string,user:User,project:Json){
 const id=String(project.id||'');if(!id)throw new Error('Project id is required')
 const team=Array.isArray(project.team)?project.team as Json[]:[];const assets=Array.isArray(project.assets)?project.assets as Json[]:[]
 const {team:_team,assets:_assets,...data}=project
 const {data:existing}=await admin.from('projects').select('created_by').eq('workspace_id',workspaceId).eq('id',id).maybeSingle()
 const row={workspace_id:workspaceId,id,project_name:String(project.projectName||''),status:String(project.status||''),confidentiality:String(project.confidentiality||'internal-only'),visibility:project.visibility==='public'?'public':'private',knowledge_status:project.knowledgeStatus==='Ready for Studio'?'Ready for Studio':'Review needed',cover_image:typeof project.coverImage==='string'&&!project.coverImage.startsWith('blob:')?project.coverImage:'',data,created_by:existing?.created_by||user.id,updated_by:user.id,updated_at:new Date().toISOString()}
 const {error}=await admin.from('projects').upsert(row,{onConflict:'workspace_id,id'});if(error)throw error
 const {error:teamDeleteError}=await admin.from('project_team_members').delete().eq('workspace_id',workspaceId).eq('project_id',id);if(teamDeleteError)throw teamDeleteError
 if(team.length){const {error:teamError}=await admin.from('project_team_members').insert(team.map(member=>({workspace_id:workspaceId,project_id:id,person_id:String(member.personId),project_role:String(member.projectRole||''),contribution:typeof member.contribution==='string'&&member.contribution?member.contribution:null})));if(teamError)throw teamError}
 const {error:assetDeleteError}=await admin.from('assets').delete().eq('workspace_id',workspaceId).eq('project_id',id);if(assetDeleteError)throw assetDeleteError
 if(assets.length){const {error:assetError}=await admin.from('assets').insert(assets.map(asset=>assetRow(workspaceId,id,user.id,asset)));if(assetError)throw assetError}
 await audit(workspaceId,user.id,'project.saved','project',id,{knowledgeStatus:row.knowledge_status})
}

async function bootstrap(user:User){
 const {workspace,role}=await ensureWorkspace(user)
 const [{data:projectRows,error:projectError},{data:people,error:peopleError},{data:team,error:teamError},{data:assets,error:assetError}]=await Promise.all([
  admin.from('projects').select('*').eq('workspace_id',workspace.id).order('updated_at',{ascending:false}),
  admin.from('people').select('*').eq('workspace_id',workspace.id).order('name'),
  admin.from('project_team_members').select('*').eq('workspace_id',workspace.id),
  admin.from('assets').select('*').eq('workspace_id',workspace.id),
 ])
 if(projectError||peopleError||teamError||assetError)throw projectError||peopleError||teamError||assetError
 const names=new Map((people||[]).map(person=>[person.id,person.name]))
 const signedUrls=new Map<string,string>()
 for(const asset of assets||[]){if(!asset.storage_path)continue;const {data}=await admin.storage.from('project-assets').createSignedUrl(asset.storage_path,3600);if(data?.signedUrl)signedUrls.set(asset.id,data.signedUrl)}
 const projects=(projectRows||[]).map(row=>({...row.data,id:row.id,projectName:row.project_name,status:row.status,confidentiality:row.confidentiality,visibility:row.visibility,knowledgeStatus:row.knowledge_status,coverImage:row.cover_image,team:(team||[]).filter(item=>item.project_id===row.id).map(item=>({personId:item.person_id,name:names.get(item.person_id)||'',projectRole:item.project_role,contribution:item.contribution||undefined})),assets:(assets||[]).filter(item=>item.project_id===row.id).map(item=>({id:item.id,type:item.type,title:item.title,caption:item.caption,url:signedUrls.get(item.id)||item.source_url||'',storagePath:item.storage_path||undefined,sourcePage:item.source_page,tags:item.tags||[],uploadedCategory:item.uploaded_category,isPrimary:item.is_primary,isSelectedForGallery:item.is_selected_for_gallery}))}))
 return{workspace,role,projects,people:(people||[]).map(person=>({id:person.id,name:person.name,position:person.position,office:person.office,email:person.email,bio:person.bio,skills:person.skills||[],...person.data}))}
}

async function route(req:IncomingMessage,res:ServerResponse){
 const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);const path=url.pathname
 if(req.method==='GET'&&path==='/api/health')return reply(res,200,{status:'ok'})
 const user=await authenticated(req);if(!user)return fail(res,401,'Authentication required')
 if(req.method==='GET'&&path==='/api/v1/bootstrap')return reply(res,200,await bootstrap(user))
 if(req.method==='POST'&&path==='/api/v1/bootstrap/seed'){
  const input=await body(req);const {workspace,role}=await ensureWorkspace(user);if(role!=='owner')return fail(res,403,'Only an Owner can seed a workspace')
  const {count}=await admin.from('projects').select('*',{count:'exact',head:true}).eq('workspace_id',workspace.id);if((count||0)>0)return reply(res,200,{seeded:false})
  const people=Array.isArray(input.people)?input.people as Json[]:[]
  if(people.length){const {error}=await admin.from('people').upsert(people.map(person=>({workspace_id:workspace.id,id:String(person.id),name:String(person.name||''),position:String(person.position||''),office:String(person.office||''),email:String(person.email||''),bio:String(person.bio||''),skills:Array.isArray(person.skills)?person.skills:[],data:{}})),{onConflict:'workspace_id,id'});if(error)throw error}
  for(const project of Array.isArray(input.projects)?input.projects as Json[]:[])await saveProject(workspace.id,user,project)
  await audit(workspace.id,user.id,'workspace.seeded','workspace',workspace.id,{projects:Array.isArray(input.projects)?input.projects.length:0,people:people.length})
  return reply(res,201,{seeded:true})
 }
 if(req.method==='POST'&&path==='/api/v1/people'){
  const input=await body(req);const workspaceId=String(input.workspaceId||'');await requireRole(user,workspaceId,['owner','editor']);const value=(input.person||{}) as Json;const name=String(value.name||'').trim();if(!name)return fail(res,400,'Person name is required')
  const row={workspace_id:workspaceId,id:crypto.randomUUID(),name,position:String(value.position||'').trim(),office:String(value.office||'').trim(),email:String(value.email||'').trim(),bio:String(value.bio||'').trim(),skills:Array.isArray(value.skills)?value.skills.map(item=>String(item).trim()).filter(Boolean):[],data:{}}
  const {data,error}=await admin.from('people').insert(row).select('id,name,position,office,email,bio,skills').single();if(error)throw error
  await audit(workspaceId,user.id,'person.created','person',row.id,{})
  return reply(res,201,{person:data})
 }
 const projectMatch=path.match(/^\/api\/v1\/projects\/([^/]+)$/)
 if(req.method==='POST'&&path==='/api/v1/projects'){
  const input=await body(req);const workspaceId=String(input.workspaceId||'');await requireRole(user,workspaceId,['owner','editor']);await saveProject(workspaceId,user,input.project as Json);return reply(res,201,{project:input.project})
 }
 if(req.method==='PUT'&&projectMatch){const input=await body(req);const workspaceId=String(input.workspaceId||'');await requireRole(user,workspaceId,['owner','editor']);await saveProject(workspaceId,user,input.project as Json);return reply(res,200,{project:input.project})}
 const inviteMatch=path.match(/^\/api\/v1\/workspaces\/([^/]+)\/invitations$/)
 if(req.method==='POST'&&inviteMatch){const workspaceId=inviteMatch[1];await requireRole(user,workspaceId,['owner']);const input=await body(req);const email=String(input.email||'').trim().toLowerCase();const role=String(input.role||'viewer') as Role;if(!email||!['owner','editor','viewer'].includes(role))return fail(res,400,'A valid email and role are required');const {data,error}=await admin.auth.admin.inviteUserByEmail(email);if(error)throw error;if(!data.user)return fail(res,502,'Supabase did not return the invited user');await admin.from('profiles').upsert({id:data.user.id,email,display_name:email.split('@')[0]});const {error:memberError}=await admin.from('workspace_members').upsert({workspace_id:workspaceId,user_id:data.user.id,role,invited_email:email,accepted_at:null},{onConflict:'workspace_id,user_id'});if(memberError)throw memberError;await audit(workspaceId,user.id,'workspace.member_invited','workspace_member',data.user.id,{role});return reply(res,201,{invited:true})}
 const uploadMatch=path.match(/^\/api\/v1\/projects\/([^/]+)\/assets\/upload-url$/)
 if(req.method==='POST'&&uploadMatch){const input=await body(req);const workspaceId=String(input.workspaceId||'');await requireRole(user,workspaceId,['owner','editor']);const projectId=decodeURIComponent(uploadMatch[1]);const filename=String(input.filename||'asset').replace(/[^a-zA-Z0-9._-]+/g,'-');const assetId=String(input.assetId||crypto.randomUUID());const storagePath=`${workspaceId}/${projectId}/${assetId}-${filename}`;const {data,error}=await admin.storage.from('project-assets').createSignedUploadUrl(storagePath);if(error)throw error;return reply(res,201,{storagePath,token:data.token})}
 if(req.method==='POST'&&path.match(/^\/api\/v1\/projects\/[^/]+\/assets$/)){const input=await body(req);const workspaceId=String(input.workspaceId||'');await requireRole(user,workspaceId,['owner','editor']);const projectId=decodeURIComponent(path.split('/')[4]);const row=assetRow(workspaceId,projectId,user.id,input.asset as Json,String(input.storagePath||''));const {error}=await admin.from('assets').upsert(row,{onConflict:'workspace_id,project_id,id'});if(error)throw error;await audit(workspaceId,user.id,'asset.created','asset',String(row.id),{projectId});return reply(res,201,{asset:row})}
 return fail(res,404,'Not found')
}

createServer((req,res)=>{route(req,res).catch(error=>{const status=typeof error?.status==='number'?error.status:500;console.error(error);fail(res,status,status===500?'Unexpected server error':error.message)})}).listen(port,'0.0.0.0',()=>console.log(`Folion API listening on ${port}`))
