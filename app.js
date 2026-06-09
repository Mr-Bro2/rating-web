// 这里填你的 Supabase 信息
const SUPABASE_URL = 'https://gykadjqiwnjzuznreryp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WVBuYK6RgERTcQ4CruTEbw_Uh7H9eUl';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let persons = [];
let currentMajor = 'all';
let currentPerson = null;
let currentUser = null;

const rankingList = document.getElementById('rankingList');
const searchInput = document.getElementById('searchInput');
const tabs = document.querySelectorAll('.tab');
const detailModal = document.getElementById('detailModal');
const modalName = document.getElementById('modalName');
const modalMajor = document.getElementById('modalMajor');
const modalScore = document.getElementById('modalScore');
const modalCount = document.getElementById('modalCount');
const scoreRange = document.getElementById('scoreRange');
const scoreValue = document.getElementById('scoreValue');
const ratingMsg = document.getElementById('ratingMsg');

async function init() {
  await ensureAnonymousUser();
  await loadPersons();
  bindEvents();
}

async function ensureAnonymousUser() {
  const { data: sessionData } = await client.auth.getSession();
  if (sessionData.session?.user) {
    currentUser = sessionData.session.user;
    return;
  }

  const { data, error } = await client.auth.signInAnonymously();
  if (error) {
    alert('匿名登录失败，请检查 Supabase Anonymous 是否开启');
    console.error(error);
    return;
  }
  currentUser = data.user;
}

async function loadPersons() {
  const { data, error } = await client
    .from('persons')
    .select('*')
    .order('average_score', { ascending: false })
    .order('score_count', { ascending: false });

  if (error) {
    rankingList.innerHTML = `<div class="card">读取数据失败：${error.message}</div>`;
    console.error(error);
    return;
  }

  persons = data || [];
  renderPersons();
  renderDeleteOptions();
  renderEditOptions();
}

function renderPersons() {
  const keyword = searchInput.value.trim();
  let list = persons;

  if (currentMajor !== 'all') list = list.filter(p => p.major === currentMajor);
  if (keyword) list = list.filter(p => p.name.includes(keyword));

  if (!list.length) {
    rankingList.innerHTML = '<div class="card">暂无人物数据</div>';
    return;
  }

  rankingList.innerHTML = list.map((p, index) => `
    <div class="card" onclick="openDetail('${p.id}')">
      <div>
        <div class="person-name">${index + 1}. ${escapeHtml(p.name)}</div>
        <span class="major">${escapeHtml(p.major || '未分类')}</span>
      </div>
      <div>
        <div class="score">${Number(p.average_score || 0).toFixed(1)}</div>
        <div class="count">${p.score_count || 0}人评分</div>
      </div>
    </div>
  `).join('');
}

function openDetail(id) {
  currentPerson = persons.find(p => p.id === id);
  if (!currentPerson) return;

  modalName.textContent = currentPerson.name;
  modalMajor.textContent = currentPerson.major || '未分类';
  modalScore.textContent = Number(currentPerson.average_score || 0).toFixed(1);
  modalCount.textContent = `${currentPerson.score_count || 0} 人已评分`;
  scoreRange.value = 10;
  scoreValue.textContent = '10';
  ratingMsg.textContent = '';
  detailModal.classList.remove('hidden');
}

async function submitRating() {
  if (!currentUser || !currentPerson) return;

  const newScore = Number(scoreRange.value);

  const { data: oldRating, error: readError } = await client
    .from('ratings')
    .select('*')
    .eq('person_id', currentPerson.id)
    .eq('user_id', currentUser.id)
    .maybeSingle();

  if (readError) {
    ratingMsg.textContent = '读取评分失败：' + readError.message;
    return;
  }

  let scoreTotal = Number(currentPerson.score_total || 0);
  let scoreCount = Number(currentPerson.score_count || 0);

  if (oldRating) {
    const oldScore = Number(oldRating.score || 0);
    scoreTotal = scoreTotal - oldScore + newScore;

    const { error } = await client
      .from('ratings')
      .update({ score: newScore })
      .eq('id', oldRating.id);

    if (error) {
      ratingMsg.textContent = '修改评分失败：' + error.message;
      return;
    }
  } else {
    scoreTotal += newScore;
    scoreCount += 1;

    const { error } = await client
      .from('ratings')
      .insert({ person_id: currentPerson.id, user_id: currentUser.id, score: newScore });

    if (error) {
      ratingMsg.textContent = '提交评分失败：' + error.message;
      return;
    }
  }

  const averageScore = scoreCount > 0 ? scoreTotal / scoreCount : 0;

  const { error: updateError } = await client
    .from('persons')
    .update({
      score_total: scoreTotal,
      score_count: scoreCount,
      average_score: averageScore
    })
    .eq('id', currentPerson.id);

  if (updateError) {
    ratingMsg.textContent = '更新平均分失败：' + updateError.message;
    return;
  }

  ratingMsg.textContent = oldRating ? '评分已修改成功' : '评分成功';
  await loadPersons();
  currentPerson = persons.find(p => p.id === currentPerson.id);
  modalScore.textContent = Number(currentPerson.average_score || 0).toFixed(1);
  modalCount.textContent = `${currentPerson.score_count || 0} 人已评分`;
}

function bindEvents() {
  searchInput.addEventListener('input', renderPersons);
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMajor = tab.dataset.major;
      renderPersons();
      document.getElementById('editPersonSelect').addEventListener('change', fillEditForm);
      document.getElementById('editPersonBtn').addEventListener('click', editPerson);
    });
  });

  document.getElementById('closeModal').addEventListener('click', () => detailModal.classList.add('hidden'));
  scoreRange.addEventListener('input', () => scoreValue.textContent = scoreRange.value);
  document.getElementById('submitScoreBtn').addEventListener('click', submitRating);

  document.getElementById('adminBtn').addEventListener('click', () => {
    document.getElementById('adminPanel').classList.toggle('hidden');
  });

  document.getElementById('loginBtn').addEventListener('click', adminLogin);
  document.getElementById('addPersonBtn').addEventListener('click', addPerson);
  document.getElementById('deletePersonBtn').addEventListener('click', deletePerson);
  document.getElementById('logoutBtn').addEventListener('click', adminLogout);
}

async function adminLogin() {
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    alert('管理员登录失败：' + error.message);
    return;
  }

  const { data: admin, error: adminError } = await client
    .from('admins')
    .select('*')
    .eq('email', data.user.email)
    .maybeSingle();

  if (adminError || !admin) {
    alert('该账号不是管理员');
    return;
  }

  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('manageBox').classList.remove('hidden');
  document.getElementById('adminStatus').textContent = `当前管理员：${data.user.email}`;
}

async function adminLogout() {
  await client.auth.signOut();
  location.reload();
}

async function addPerson() {
  const name = document.getElementById('newName').value.trim();
  const major = document.getElementById('newMajor').value;
  if (!name) return alert('请输入人物名称');

  const { error } = await client.from('persons').insert({
    name,
    major,
    avatar: null,
    score_total: 0,
    score_count: 0,
    average_score: 0
  });

  if (error) {
    alert('添加失败：' + error.message);
    return;
  }

  document.getElementById('newName').value = '';
  await loadPersons();
  alert('添加成功');
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

init();
function renderDeleteOptions() {
  const select = document.getElementById('deletePersonSelect');
  if (!select) return;

  select.innerHTML = '<option value="">选择要删除的人物</option>';

  persons.forEach(person => {
    const option = document.createElement('option');
    option.value = person.id;
    option.textContent = `${person.name}（${person.major || '未分类'}）`;
    select.appendChild(option);
  });
}

async function deletePerson() {
  const id = document.getElementById('deletePersonSelect').value;

  if (!id) {
    alert('请先选择要删除的人物');
    return;
  }

  const person = persons.find(p => p.id === id);

  if (!confirm(`确定要删除「${person?.name || '该人物'}」吗？删除后相关评分也会一起删除。`)) {
    return;
  }

  const { error: ratingError } = await client
    .from('ratings')
    .delete()
    .eq('person_id', id);

  if (ratingError) {
    alert('删除评分记录失败：' + ratingError.message);
    return;
  }

  const { error: personError } = await client
    .from('persons')
    .delete()
    .eq('id', id);

  if (personError) {
    alert('删除人物失败：' + personError.message);
    return;
  }

  alert('删除成功');
  await loadPersons();
}
