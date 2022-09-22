import { task } from "../templates/task.js";
import { tasks } from "../services/storage.js";
import {
  MIN_TASK_WIDTH,
  MINUTES_TO_PIXELS,
  HEADER_HEIGHT,
  HOUR,
  DAY_LIMIT,
  DEFAULT_DURATION,
  DEFAULT_TITLE,
  TASK,
  DEFAULT_COLOR,
  ACTIONS,
} from "../constants/constants.js";
import { color } from "../utils/color.js";
import EventEmitter from "../events/EventEmitter.js";

class Day {
  constructor(plan) {
    const savedTasks = tasks.get();

    this.maxPosY =
      HEADER_HEIGHT +
      (DAY_LIMIT.END - DAY_LIMIT.START) * HOUR * MINUTES_TO_PIXELS;

    if (savedTasks) {
      this.data = savedTasks;
    }

    if (!savedTasks) {
      this.data = plan;
      tasks.set(this.data);
    }

    this.defaultBgColor = DEFAULT_COLOR;
    this.plan = this.data
      .sort((a, b) => a.start - b.start)
      .reduce(this.reducer.bind(this), []);
    this.parent = document.querySelector("#tasks");
    this.events = new EventEmitter();
    this.taskEditListeners = this.taskEditHandlers.bind(this);

    this.render();
    this.onClick();
  }

  reducer(previousValue, currentValue) {
    const _task = {
      ...currentValue,
      bg: currentValue.color ? currentValue.color : this.defaultBgColor,
      border: currentValue.color
        ? color.getBorderColorString(currentValue.color)
        : color.getBorderColorString(this.defaultBgColor),
      left: 0,
      minTitle: currentValue.title,
      width: "100%",
    };

    previousValue.forEach((elem) => {
      if (
        currentValue.start >= elem.start &&
        currentValue.start <= elem.start + elem.duration
      ) {
        _task.left = elem.left + MIN_TASK_WIDTH;
        _task.width = `calc(100% - ${elem.left + MIN_TASK_WIDTH}px)`;
        elem.width = `${MIN_TASK_WIDTH}px`;
        elem.minTitle = `${
          elem.title.length > 25
            ? elem.minTitle.slice(0, 25) + "..."
            : elem.minTitle
        }`;
      }
    });

    return previousValue.concat([_task]);
  }

  render() {
    const tasks = this.plan.map((element) => task(element)).join("");

    return (this.parent.innerHTML = tasks);
  }

  update({ data, event, type }) {
    if (!data && type !== ACTIONS.DELETE) {
      this.newTaskHandler(event);
      return;
    }

    if (!data && type === ACTIONS.DELETE) this.deleteTaskHandler(event);
    if (data && type === ACTIONS.CREATE) this.createTaskHandler(data);
    if (data && type === ACTIONS.UPDATE) this.updateTaskHandler(data);

    this.plan = tasks
      .get()
      .sort((a, b) => a.start - b.start)
      .reduce(this.reducer.bind(this), []);

    this.clearTasks();
    this.render();
    this.onClick();
  }

  newTaskHandler(event) {
    const newTask = {};

    if (event.pageY >= this.maxPosY) {
      newTask.start = Math.round(
        (this.maxPosY - HEADER_HEIGHT) / MINUTES_TO_PIXELS - DEFAULT_DURATION
      );
      newTask.duration = DEFAULT_DURATION;
    } else if (
      event.pageY + DEFAULT_DURATION * MINUTES_TO_PIXELS >=
      this.maxPosY
    ) {
      newTask.duration = Math.floor(
        (this.maxPosY - event.pageY) / MINUTES_TO_PIXELS
      );
      newTask.start = Math.round(
        (this.maxPosY - HEADER_HEIGHT) / MINUTES_TO_PIXELS - newTask.duration
      );
    } else {
      newTask.start = Math.round(
        (event.pageY - HEADER_HEIGHT) / MINUTES_TO_PIXELS
      );
      newTask.duration = DEFAULT_DURATION;
    }

    newTask.title = DEFAULT_TITLE;
    newTask.id = "new";
    this.plan = this.plan
      .concat([newTask])
      .sort((a, b) => a.start - b.start)
      .reduce(this.reducer.bind(this), []);

    this.clearTasks();
    this.render();
    this.onClick();
  }

  deleteTaskHandler() {
    const currentElemTitle = this.editing;

    const all = tasks.get().filter((elem) => elem.title !== currentElemTitle);

    tasks.set(all);
  }

  createTaskHandler(data) {
    const all = tasks.get().concat([data]);

    tasks.set(all);
  }

  updateTaskHandler(data) {
    const currentElemTitle = this.editing;

    const all = tasks
      .get()
      .filter((elem) => elem.title !== currentElemTitle)
      .concat([data]);

    tasks.set(all);
  }

  cancel(data) {
    if (!data) {
      this.plan = this.plan
        .filter((elem) => !elem.id)
        .sort((a, b) => a.start - b.start)
        .reduce(this.reducer.bind(this), []);

      this.clearTasks();
      this.render();
      this.onClick();
    }

    if (data) {
      const editingElem = this.parent.querySelector("#edit");

      editingElem?.removeAttribute("id");
    }
  }

  clearTasks() {
    this.parent
      .querySelectorAll('[data-type="task"]')
      .forEach((elem) =>
        elem.removeEventListener("click", this.taskEditListeners)
      );

    if (this.parent) {
      while (this.parent.lastChild) {
        this.parent.removeChild(this.parent.lastChild);
      }
    }
  }

  taskEditHandlers(event) {
    const data = this.plan.find(
      (elem) => elem.title === event.target.getAttribute("data-task")
    );
    this.editing = event.target.getAttribute("data-task");
    this.events.emit(TASK.CHANGE, data, event);
  }

  onClick() {
    this.parent
      .querySelectorAll('[data-type="task"]')
      .forEach((elem) =>
        elem.addEventListener("click", this.taskEditListeners)
      );
  }
}

export default Day;
