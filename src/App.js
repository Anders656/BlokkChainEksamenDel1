import { useEffect, useState } from "react";
import { ethers } from "ethers";

// Components
import Navigation from "./components/Navigation";
import Task from "./components/Task";

// ABIs
import TodoWeb3 from "./abis/TodoWeb3.json";
import TodoListABI from "./TodoListABI.json";

// Config
import config from "./config.json";

const CONTRACT_ADDRESS = "0xdd1E4C96faee94f34CA66A80D0c1A83879a8dE29";

function App() {
  // Tilstand fra TodoApp
  const [simpleTasks, setSimpleTasks] = useState([]);
  const [newSimpleTask, setNewSimpleTask] = useState("");
  const [simpleContract, setSimpleContract] = useState(null);

  // Tilstand fra App
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [todoWeb3, setTodoWeb3] = useState(null);
  const [taskCount, setTaskCount] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  // ✅ Load blockchain data robust
  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const _provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(_provider);

        const _signer = _provider.getSigner();
        const _simpleContract = new ethers.Contract(CONTRACT_ADDRESS, TodoListABI, _signer);
        setSimpleContract(_simpleContract);

        const network = await _provider.getNetwork();

        // ✅ ROBUST sjekk
        const networkConfig = config[network.chainId];
        if (!networkConfig || !networkConfig.TodoWeb3) {
          alert(`Unsupported network (${network.chainId}). Please connect to Sepolia.`);
          return;
        }

        const _todoWeb3 = new ethers.Contract(
          networkConfig.TodoWeb3.address,
          TodoWeb3.abi,
          _provider
        );
        setTodoWeb3(_todoWeb3);

        await loadTasks(_todoWeb3);
        await loadSimpleTasks(_simpleContract);
      }
    };
    init();
  }, []);

  // ✅ SimpleContract
  const loadSimpleTasks = async (contract) => {
    const tasks = await contract.getTasks();
    setSimpleTasks(tasks);
  };

  const addSimpleTask = async () => {
    if (simpleContract && newSimpleTask) {
      const tx = await simpleContract.addTask(newSimpleTask);
      await tx.wait();
      setNewSimpleTask("");
      await loadSimpleTasks(simpleContract);
    }
  };

  const completeSimpleTask = async (taskId) => {
    if (simpleContract) {
      const tx = await simpleContract.completeTask(taskId);
      await tx.wait();
      await loadSimpleTasks(simpleContract);
    }
  };

  // ✅ TodoWeb3
  const loadTasks = async (todoWeb3) => {
    const taskCount = await todoWeb3.taskCount();
    setTaskCount(taskCount);

    const tasks = [];
    for (var i = 1; i <= taskCount; i++) {
      const task = await todoWeb3.tasks(i);
      tasks.push(task);
    }
    setTasks(tasks);
    setFilteredTasks(tasks);
  };

  const addTask = async (t) => {
    const signer = await provider.getSigner();
    let transaction = await todoWeb3.connect(signer).createTask(t);
    await transaction.wait();
    setNewTask("");
    await loadTasks(todoWeb3);
  };

  const filterTasks = (e) => {
    const selectedFilter = e.currentTarget.id;
    if (selectedFilter !== activeFilter) {
      let filteredTasks = tasks;
      let completed = false;
      if (selectedFilter !== "all") {
        if (selectedFilter === "completed") {
          completed = true;
        }
        filteredTasks = tasks.filter((task) => task.completed === completed);
      }
      setFilteredTasks(filteredTasks);
      setActiveFilter(selectedFilter);
    }
  };

  const handleKeyDown = async (e) => {
    if (e.key === "Enter") {
      let inputTask = e.currentTarget.value;
      await addTask(inputTask);
    }
  };

  const clearCompleted = async () => {
    const signer = await provider.getSigner();
    let transaction = await todoWeb3.connect(signer).clearCompletedTasks();
    await transaction.wait();
    setNewTask("");
    await loadTasks(todoWeb3);
  };

  return (
    <>
      <Navigation account={account} connectWallet={() => {}} />

      {/* Simple Contract UI */}
      <div>
        <h1>Gjøremålsliste (Simple Contract)</h1>
        <input
          value={newSimpleTask}
          onChange={(e) => setNewSimpleTask(e.target.value)}
        />
        <button onClick={addSimpleTask}>Legg til oppgave</button>
        <ul>
          {simpleTasks.map((task, index) => (
            <li key={index}>
              {task.description}{" "}
              {task.completed ? "✔" : (
                <button onClick={() => completeSimpleTask(task.id)}>Fullfør</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* TodoWeb3 UI */}
      <div className="wrapper">
        <div className="task-input">
          <ion-icon name="create-outline">&#127919;</ion-icon>
          <input
            id="newTask"
            type="text"
            className="form-control"
            placeholder="Type a task and Enter"
            value={newTask}
            onChange={(e) => setNewTask(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            required
          />
        </div>
        <div className="controls">
          <div className="filters">
            <span onClick={filterTasks} className={activeFilter === "all" ? "active" : ""} id="all">All</span>
            <span onClick={filterTasks} className={activeFilter === "pending" ? "active" : ""} id="pending">Pending</span>
            <span onClick={filterTasks} className={activeFilter === "completed" ? "active" : ""} id="completed">Completed</span>
          </div>
          <button
            className="clear-btn active"
            hidden={activeFilter === "pending"}
            onClick={clearCompleted}
          >
            Clear completed
          </button>
        </div>
        <ul className="task-box">
          {filteredTasks.map((task, index) => (
            <Task
              task={task}
              todoWeb3={todoWeb3}
              provider={provider}
              id={index + 1}
              key={index}
            />
          ))}
        </ul>
      </div>
    </>
  );
}

export default App;
