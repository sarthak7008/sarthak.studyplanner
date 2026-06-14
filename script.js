const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

renderTasks();

function addTask() {

    const taskText = taskInput.value.trim();

    if(taskText === ""){
        alert("Enter a task");
        return;
    }

    tasks.push({
        text: taskText,
        completed: false
    });

    saveTasks();
    renderTasks();

    taskInput.value = "";
}

function renderTasks(){

    taskList.innerHTML = "";

    tasks.forEach((task,index)=>{

        const li = document.createElement("li");
        li.className = task.completed ? "task completed" : "task";

        li.innerHTML = `
            <div class="left">
                <input type="checkbox"
                ${task.completed ? "checked" : ""}
                onchange="toggleTask(${index})">

                <span>${task.text}</span>
            </div>

            <button class="delete-btn"
            onclick="deleteTask(${index})">
            Delete
            </button>
        `;

        taskList.appendChild(li);
    });

    updateStats();
}

function toggleTask(index){

    tasks[index].completed =
    !tasks[index].completed;

    saveTasks();
    renderTasks();
}

function deleteTask(index){

    tasks.splice(index,1);

    saveTasks();
    renderTasks();
}

function saveTasks(){

    localStorage.setItem(
        "tasks",
        JSON.stringify(tasks)
    );
}

function updateStats(){

    const total = tasks.length;

    const completed =
    tasks.filter(task => task.completed).length;

    const pending =
    total - completed;

    document.getElementById(
        "totalTasks"
    ).innerText = total;

    document.getElementById(
        "completedTasks"
    ).innerText = completed;

    document.getElementById(
        "pendingTasks"
    ).innerText = pending;

    const progress =
    total === 0
    ? 0
    : (completed/total)*100;

    document.getElementById(
        "progress"
    ).style.width =
    progress + "%";

    document.getElementById(
        "progressText"
    ).innerText =
    Math.round(progress) +
    "% Completed";
}

taskInput.addEventListener(
    "keypress",
    function(e){

        if(e.key === "Enter"){
            addTask();
        }
    }
);