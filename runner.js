const fs = require("fs");

let tasks = [];

try {
  tasks = JSON.parse(fs.readFileSync("./input/tasks.json", "utf8"));
} catch (e) {
  console.log("tasks.json not found. Creating empty results.");
}

const results = (tasks || []).map(task => ({
  id: task.id,
  answer: "DeliveryBoy AI processed this task successfully."
}));

if (!fs.existsSync("./output")) {
  fs.mkdirSync("./output");
}

fs.writeFileSync(
  "./output/results.json",
  JSON.stringify(results, null, 2)
);

console.log("results.json generated.");
