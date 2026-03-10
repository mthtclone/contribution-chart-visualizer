// --- Members ---
let members = [];
function renderMembers() {
  const list = document.getElementById('memberList');
  list.innerHTML = "";

  const contrib = computeContributions();

  members.forEach((m, idx) => {
    const div = document.createElement('div');
    div.className = 'member-item';

    const total = contrib[m]
      ? (contrib[m].Individual + contrib[m].Shared + contrib[m].Team).toFixed(2)
      : 0;

    div.innerHTML = `
      <div class="member-info">
        <span class="member-name">${m}</span>
        <span class="member-total">${total} tasks</span>
      </div>
      <button class="member-btn" data-index="${idx}">Remove</button>
    `;

    list.appendChild(div);

    div.querySelector('button').addEventListener('click', () => {
      members.splice(idx, 1);
      renderMembers();
      renderTeams();
      renderTasks();
      updateChart();
      saveState();
    });
  });
}

document.getElementById('addMemberBtn').addEventListener('click', () => {
  const name = document.getElementById('newMemberInput').value.trim();
  if (name && !members.includes(name)) {
    members.push(name);
    document.getElementById('newMemberInput').value = "";
    renderMembers();
    renderTeams();
    renderTasks();
    updateChart();
  }
});

// --- Teams ---
let teams = {}; // {teamName: [members]}
function renderTeams() {
  const list = document.getElementById('teamList');
  list.innerHTML = "";
  Object.keys(teams).forEach(t => {
    const div = document.createElement('div');
    div.className = 'team-item';
    const options = members.map(m => `<option value="${m}" ${teams[t].includes(m) ? 'selected' : ''}>${m}</option>`).join('');
    div.innerHTML = `
      <span>${t}</span>
      <select multiple class="team-members">${options}</select>
      <button data-team="${t}">Remove</button>
    `;
    list.appendChild(div);

    div.querySelector('button').addEventListener('click', () => {
      delete teams[t];
      renderTeams();
      renderTasks();
      updateChart();
    });

    div.querySelector('.team-members').addEventListener('change', e => {
      teams[t] = Array.from(e.target.selectedOptions).map(opt => opt.value);
      updateChart();
    });
  });
}

document.getElementById('addTeamBtn').addEventListener('click', () => {
  const tName = document.getElementById('newTeamInput').value.trim();
  if (tName && !teams[tName]) {
    teams[tName] = [];
    document.getElementById('newTeamInput').value = "";
    renderTeams();
    updateChart();
  }
});

// --- Tasks ---
let tasks = []; // {name, individuals:[{name, bonus}], teams:[]}

function renderTasks() {
  const list = document.getElementById('taskList');
  list.innerHTML = "";

  tasks.forEach((task, idx) => {
    const div = document.createElement('div');
    div.className = 'task-item';

    // Individual options
    const indOptions = members
      .map(
        m => `<option value="${m}" ${task.individuals.find(i => i.name === m) ? 'selected' : ''}>${m}</option>`
      ).join('');

    // Team options
    const teamOptions = Object.keys(teams)
      .map(t => `<option value="${t}" ${task.teams.includes(t) ? 'selected' : ''}>${t}</option>`)
      .join('');

    // Bonus controls
    const bonusControls = task.individuals
      .map((i, iidx) => `
        <div>
          <span>${i.name}</span>
          <select class="bonus-select" data-idx="${iidx}">
            <option value="0" ${i.bonus===0?'selected':''}>No Bonus</option>
            <option value="0.5" ${i.bonus===0.5?'selected':''}>0.5</option>
            <option value="1" ${i.bonus===1?'selected':''}>1</option>
          </select>
        </div>
      `).join('');

    div.innerHTML = `
      <strong>#${idx + 1}:</strong>
      <input type="text" value="${task.name}" class="task-name">
      <select multiple class="task-individuals">${indOptions}</select>
      <div class="bonus-container">${bonusControls}</div>
      <select multiple class="task-teams">${teamOptions}</select>
      <button data-index="${idx}">Remove</button>
    `;
    list.appendChild(div);

    // Event listeners
    div.querySelector('.task-name').addEventListener('input', e => {
      task.name = e.target.value;
      updateChart();
    });

    div.querySelector('.task-individuals').addEventListener('change', e => {
      const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
      task.individuals = selected.map(mName => {
        const existing = task.individuals.find(i => i.name === mName);
        return { name: mName, bonus: existing ? existing.bonus : 0 };
      });

      // Rebuild bonus controls
      const bonusContainer = div.querySelector('.bonus-container');
      bonusContainer.innerHTML = task.individuals
        .map((i, iidx) => `
          <div>
            <span>${i.name}</span>
            <select class="bonus-select" data-idx="${iidx}">
              <option value="0" ${i.bonus===0?'selected':''}>No Bonus</option>
              <option value="0.5" ${i.bonus===0.5?'selected':''}>0.5</option>
              <option value="1" ${i.bonus===1?'selected':''}>1</option>
            </select>
          </div>
        `).join('');

      // Attach bonus event listeners
      bonusContainer.querySelectorAll('.bonus-select').forEach(sel => {
        sel.addEventListener('change', e => {
          const iidx = parseInt(e.target.dataset.idx);
          task.individuals[iidx].bonus = parseFloat(e.target.value);
          updateChart();
        });
      });

      updateChart();
    });

    div.querySelector('.task-teams').addEventListener('change', e => {
      task.teams = Array.from(e.target.selectedOptions).map(opt => opt.value);
      updateChart();
    });

    div.querySelector('button').addEventListener('click', () => {
      tasks.splice(idx, 1);
      renderTasks();
      updateChart();
    });

    // Attach bonus listeners initially
    div.querySelectorAll('.bonus-select').forEach(sel => {
      sel.addEventListener('change', e => {
        const iidx = parseInt(e.target.dataset.idx);
        task.individuals[iidx].bonus = parseFloat(e.target.value);
        updateChart();
      });
    });
  });
}

document.getElementById('addTaskBtn').addEventListener('click', () => {
  tasks.push({ name: 'New Task', individuals: [], teams: [] });
  renderTasks();
  updateChart();
});

// --- Compute Contributions ---
function computeContributions() {
  const contrib = {};
  members.forEach(m => (contrib[m] = { Individual: 0, Shared: 0, Team: 0, Bonus: 0 }));

  tasks.forEach(task => {
    let expanded = task.individuals.map(i => i.name);
    task.teams.forEach(t => {
      if (teams[t]) expanded = expanded.concat(teams[t]);
    });

    const n = expanded.length;

    expanded.forEach(a => {
      const ind = task.individuals.find(i => i.name === a);
      const bonus = ind ? ind.bonus : 0;

      if (ind && n === 1) contrib[a].Individual += 1;
      else if (ind && n > 1) contrib[a].Shared += 1 / n;
      else contrib[a].Team += 1 / n;

      // add bonus separately
      if (bonus) contrib[a].Bonus += bonus;
    });
  });

  return contrib;
}

// --- Chart.js ---
const ctx = document.getElementById('contributionChart').getContext('2d');
let chart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: members,
    datasets: [
      { label: 'Individual', data: [], backgroundColor: '#4CAF50' },
      { label: 'Shared', data: [], backgroundColor: '#2196F3' },
      { label: 'Team', data: [], backgroundColor: '#FFC107' },
      { label:'Bonus', data:[], backgroundColor:'#27F5DD'}
    ]
  },
  options: {
    plugins: { title: { display: true, text: 'ERPNext Task Contributions per Assignee' } },
    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
  }
});

function updateChart() {
  const raw = computeContributions();
  chart.data.labels = members;
  chart.data.datasets[0].data = members.map(m => raw[m].Individual);
  chart.data.datasets[1].data = members.map(m => raw[m].Shared);
  chart.data.datasets[2].data = members.map(m => raw[m].Team);
  chart.data.datasets[3].data = members.map(m=> raw[m].Bonus);
  chart.update();
}

// --- Save/Load State ---
function saveState() {
  localStorage.setItem('members', JSON.stringify(members));
  localStorage.setItem('teams', JSON.stringify(teams));
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadState() {
  const savedMembers = localStorage.getItem('members');
  const savedTeams = localStorage.getItem('teams');
  const savedTasks = localStorage.getItem('tasks');

  if (savedMembers) members = JSON.parse(savedMembers);
  if (savedTeams) teams = JSON.parse(savedTeams);
  if (savedTasks) {
    tasks = JSON.parse(savedTasks).map(task => ({
      ...task,
      individuals: task.individuals.map(i =>
        typeof i === 'string' ? { name: i, bonus: 0 } : i
      )
    }));
  }
}

// --- Export / Import JSON ---
document.getElementById('exportBtn').addEventListener('click', () => {
  const data = { members, teams, tasks };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = "dashboard_data.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.members && data.teams && data.tasks) {
        members = data.members;
        teams = data.teams;
        tasks = data.tasks.map(task => ({
          ...task,
          individuals: task.individuals.map(i =>
            typeof i === 'string' ? { name: i, bonus: 0 } : i
          )
        }));
        renderMembers();
        renderTeams();
        renderTasks();
        updateChart();
        saveState();
      } else alert("Invalid JSON format.");
    } catch (err) {
      alert("Failed to parse JSON: " + err.message);
    }
  };
  reader.readAsText(file);
});

// --- Tabs ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- Init ---
loadState();
renderMembers();
renderTeams();
renderTasks();
updateChart();