<script>
 import TodoItem from './Todoitem.svelte';

 let  newTodoTitle ='';
 let currentFilter ='all';
 let nextId = 4;

  let todos =[
      {
          id : 1,
          title: "Mytodo",
          date: "21/01/20",
          completed:false
      },
       {
          id : 2,
          title: "Mytodo two",
          date: "21/01/20",
          completed:false
      },
       {
          id : 3,
          title: "Mytodo three",
          date: "21/01/20",
          completed:false
      },
  ];

  function addTodo(event){
      if(event.key==='Enter'){
          todos=[...todos, {
              id: nextId,
              completed:false,
              title: newTodoTitle
          }];

          nextId=nextId +1;
          newTodoTitle='';
      }
  }


  $: todosRemaining=filteredTodos.filter(todo => !todo.completed).length;
  $: filteredTodos= currentFilter==='all'?todos:currentFilter==='completed'
    ? todos.filter(todo =>todo.completed)
    : todos.filter(todo =>!todo.completed)

function checkAllTodos(event){
    todos.forEach(todo =>todo.completed=event.target.checked);
    todos=todos;
}

function updateFilter(newFilter){
    currentFilter=newFilter;
}
function clearCompleted(){
    todos=todos.filter(todo=>!todo.completed);
    }
function handleDeleteTodo(event){
    todos=todos.filter(todo=> todo.id !==event.detail.id);
}
function handleToggleComplete(event){
    const todoIndex=todos.findIndex(todo=>todo.id===event.detail.id);
    const upadtedTodo= {...todos[todoIndex], completed: !todos[todoIndex].completed}

    todos=[
        ...todos.slice(0,todoIndex),

        upadtedTodo,
        ...todos.slice(todoIndex+1)
    ];
}


function getTodo(){
    let getRequest = new getTodoParams();
      this.client.getTodos(getRequest, {}, (err, response) => {
        this.todos = response.toObject().todosList;
        console.log(this.todos);
      });
}
function addTodo(){
     let request = new addTodoParams();
      request.setTask(this.inputField);
      this.client.addTodo(request, {}, () => {
        this.inputField = "";
        this.getTodos();
      });
}
function deleteTodo(){
    let deleteRequest = new deleteTodoParams();
      deleteRequest.setId(todo.id);
      this.client.deleteTodo(deleteRequest, {}, (err, response) => {
        if (response.getMessage() === "success") {
          this.getTodos();
        }
      });
      console.log("todo -> ", todo.id);
}
</script>
<style>
    .container {
        max-width: 500px;
        margin: 10px auto;
        border-style: outset;
        padding: 11px;
    }
    .logo {
        display: block;
        margin: 20px auto;
        width: 50%;
        height: 170px;
    }
    .todo-input {
        width: 100%;
        padding: 10px, 20px;
        font-size: 18px;
        margin-bottom: 20px;
    }
    .inner-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 16px;
        border-top: 1px solid lightgrey;
        padding-top: 15px;
        margin-bottom: 18px;
    }
    .inner-container-input {
        margin-right: 12px;
    }
    button {
        font-size: 14px;
        background-color: white;
        appearance: none;
    }
    button:hover {
        background: lightseagreen;
    }
    button:focus {
        outline: none;
    }
    .active {
        background: lightseagreen;
    }
</style>


<div class="container">
      <h2 class="heading" margin="auto" align="center">Svelte TODO App</h2>
     <img src={'/img/logo.png'} alt="LOGO" class="logo">
    
     <input type="text" class="todo-input" placeholder="Insert todo item ..." bind:value={newTodoTitle} on:keydown={addTodo} >

     {#each filteredTodos as todo }
       <div class="todo-item">
        <TodoItem {...todo} on:deleteTodo={handleDeleteTodo} on:toggleComplete={handleToggleComplete}/>

       </div>
     {/each}

      <div class="inner-container">
      <div><lable>
      <input class="inner-container-input" type="checkbox" on:change={checkAllTodos}>Check All</lable>
      
      </div>
      <div>{todosRemaining} items left       
      
       </div></div>

       <div class="inner-container">
       <div><button on:click={()=> updateFilter('all')} class:active="{currentFilter === 'all'}" >All</button>
       <button on:click={()=> updateFilter('active')} class:active="{currentFilter === 'active'}" >Active</button>
       <button on:click={()=> updateFilter('completed')} class:active="{currentFilter === 'completed'}" >Completed</button>
       
       </div>
       <div>
       <button on:click={clearCompleted} >Clear Completed</button>
       
       </div>
       </div>
</div>