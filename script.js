const cards = [
  { word: "Apple", taboo: ["Fruit", "Red", "Tree", "iPhone", "Mac"] },
  { word: "Sun", taboo: ["Hot", "Day", "Sky", "Shine", "Light"] },
  { word: "Dog", taboo: ["Bark", "Pet", "Animal", "Tail", "Puppy"] },
  { word: "Pizza", taboo: ["Cheese", "Italian", "Slice", "Oven", "Toppings"] },
  { word: "Car", taboo: ["Drive", "Wheels", "Engine", "Road", "Vehicle"] },
  { word: "Book", taboo: ["Read", "Library", "Pages", "Story", "Author"] },
  { word: "Football", taboo: ["Goal", "Kick", "Sport", "Team", "Stadium"] },
  { word: "Water", taboo: ["Drink", "Liquid", "Blue", "Thirst", "Bottle"] },
  { word: "Computer", taboo: ["Laptop", "Keyboard", "Screen", "Mouse", "Technology"] },
  { word: "Guitar", taboo: ["Music", "Strings", "Instrument", "Play", "Rock"] }
];

function nextCard() {
  const randomIndex = Math.floor(Math.random() * cards.length);
  const card = cards[randomIndex];
  document.getElementById("main-word").innerText = card.word;
  const list = document.getElementById("taboo-list");
  list.innerHTML = "";
  card.taboo.forEach(item => {
    const li = document.createElement("li");
    li.innerText = item;
    list.appendChild(li);
  });
}
