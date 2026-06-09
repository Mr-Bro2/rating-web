const STORAGE_KEY='rating_app_persons_v1';
const USER_KEY='rating_app_user_id_v1';
let currentMajor='全部';
let currentPersonId=null;
let selectedScore=null;

function getUserId(){let id=localStorage.getItem(USER_KEY);if(!id){id='u_'+Date.now()+'_'+Math.random().toString(16).slice(2);localStorage.setItem(USER_KEY,id)}return id}
function seed(){return[
{id:1,name:'张三',major:'计算机',desc:'活跃 / 技术流',scoreTotal:87,scoreCount:10,ratings:{}},
{id:2,name:'李四',major:'计算机',desc:'学霸 / 低调',scoreTotal:92,scoreCount:10,ratings:{}},
{id:3,name:'王五',major:'商科',desc:'社交强 / 表达力好',scoreTotal:81,scoreCount:10,ratings:{}},
{id:4,name:'赵六',major:'商科',desc:'认真 / 稳定发挥',scoreTotal:76,scoreCount:10,ratings:{}}
]}
function load(){const raw=localStorage.getItem(STORAGE_KEY);if(!raw){localStorage.setItem(STORAGE_KEY,JSON.stringify(seed()));return seed()}return JSON.parse(raw)}
function save(data){localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}
function avg(p){return p.scoreCount? (p.scoreTotal/p.scoreCount).toFixed(1):'暂无'}
function setMajor(m){currentMajor=m;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.major===m));render()}
function render(){const q=document.getElementById('searchInput').value.trim();let data=load();let list=data.filter(p=>(currentMajor==='全部'||p.major===currentMajor)&&(!q||p.name.includes(q)||p.desc.includes(q)));list.sort((a,b)=>(b.scoreCount?b.scoreTotal/b.scoreCount:0)-(a.scoreCount?a.scoreTotal/a.scoreCount:0));document.getElementById('listTitle').innerText=currentMajor==='全部'?'热门评分榜':currentMajor+'专业评分榜';document.getElementById('countText').innerText=list.length+' 个对象';const box=document.getElementById('personList');if(!list.length){box.innerHTML='<div class="empty">没有找到相关人物</div>';return}box.innerHTML=list.map((p,i)=>`<div class="person-card" onclick="openDetail(${p.id})"><div class="avatar">${p.name[0]}</div><div class="info"><h3>${i+1}. ${p.name}</h3><p>${p.major} · ${p.desc||'暂无简介'}</p><span class="badge">${p.scoreCount} 人评分</span></div><div class="score"><strong>${avg(p)}</strong><span>平均分</span></div></div>`).join('')}
function openDetail(id){currentPersonId=id;selectedScore=null;const p=load().find(x=>x.id===id);const userScore=p.ratings[getUserId()];if(userScore!==undefined) selectedScore=userScore;document.getElementById('detailModal').classList.remove('hidden');renderDetail()}
function renderDetail(){const p=load().find(x=>x.id===currentPersonId);const buttons=Array.from({length:11},(_,i)=>`<button class="${selectedScore===i?'selected':''}" onclick="selectScore(${i})">${i}</button>`).join('');document.getElementById('detailContent').innerHTML=`<div class="detail-top"><div class="big-avatar">${p.name[0]}</div><h2>${p.name}</h2><p>${p.major} · ${p.desc||'暂无简介'}</p><div class="big-score">${avg(p)}</div><p>${p.scoreCount} 人已评分</p></div><h3>请选择你的评分</h3><div class="score-grid">${buttons}</div><button class="submit" onclick="submitScore()">提交匿名评分</button><p class="disclaimer">提示：每个浏览器用户对同一人物只记录一次评分，再次提交会修改原评分，不会重复增加人数。</p>`}
function selectScore(s){selectedScore=s;renderDetail()}
function submitScore(){if(selectedScore===null){alert('请先选择评分');return}let data=load();const p=data.find(x=>x.id===currentPersonId);const uid=getUserId();if(p.ratings[uid]!==undefined){p.scoreTotal=p.scoreTotal-p.ratings[uid]+selectedScore}else{p.scoreTotal+=selectedScore;p.scoreCount+=1}p.ratings[uid]=selectedScore;save(data);alert('评分成功，已匿名记录');renderDetail();render()}
function closeDetail(){document.getElementById('detailModal').classList.add('hidden')}
function openAdmin(){document.getElementById('adminModal').classList.remove('hidden')}
function closeAdmin(){document.getElementById('adminModal').classList.add('hidden')}
function addPerson(){const name=document.getElementById('newName').value.trim();const major=document.getElementById('newMajor').value;const desc=document.getElementById('newDesc').value.trim();if(!name){alert('请输入名称');return}let data=load();data.push({id:Date.now(),name,major,desc,scoreTotal:0,scoreCount:0,ratings:{}});save(data);document.getElementById('newName').value='';document.getElementById('newDesc').value='';closeAdmin();render()}
render();
