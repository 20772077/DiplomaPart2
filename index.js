let express = require(`express`);
let app = express();
let port = 3005;

app.listen(port, function () {
    console.log(`http://localhost:${port}`);
});

// Настройка CORS
let cors = require('cors');
app.use(cors({ origin: 'http://localhost:5173' }));


// Настройка POST-запроса — JSON
app.use(express.json());

// Настройка БД
let mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/PixelProject2');

const spriteSetSchema = new mongoose.Schema({
    name: { type: String,  unique: true },
    sprites: [{ type: String }]
  });
  
module.exports = mongoose.model('SpriteSet', spriteSetSchema);

let Sprites = mongoose.model('spriteset', spriteSetSchema);

// Получить все наборы спрайтов
app.get('/spritesets', async (req, res) => {
  let location = req.query.location;
  const sets = await Sprites.find({'name': location}, {sprites:1});
  console.log(sets);
  res.send(sets);
});


//USERS
const UsersSchema = new mongoose.Schema({
    name: { type: String,  unique: true },
    dynamite: { type: Number, default: 1 },
    potatoes: { type: Number, default: 0 },
    hasVictory: { type: Boolean, default: false }
  });

let Users = mongoose.model('Users', UsersSchema);

// Записать пользователя
app.post('/api/register', async (req, res) => {
  try{
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

    const newUser = await Users.create({'name':name})
    console.log(newUser);
    res.status(201).json(newUser);
  }catch{
    if (err.code === 11000) { // дублирование уникального поля
      res.status(409).json({ error: 'User already exists' });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// Получить пользователя
app.get('/api/register', async (req, res) => {
  const { name } = req.query;
  const gamer = await Users.find({'name': name});
  res.json(gamer);
});

//Обновить данные пользователя НА ДАННЫЙ МОМЕНТ РАБОТАЕТ
// ОБНОВЛЕНИЕ КАРТОШКИ И ДИНАМИТА В ИГРЕ
// ПОКУПКА ДИНАМИТА И КОНЦОВКИ В МАГАЗИНЕ
app.put('/api/items/:user_id', async (req, res) => {
  const { user_id } = req.params;
  const updateData = req.body;
  
  try {
    const updatedDocument = await Users.findByIdAndUpdate(user_id, updateData, { new: true });
    res.json(updatedDocument);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Маршрут для удаления пользователя по ID
app.delete('/api/users/:user_deleted_id', async (req, res) => {
  const { user_deleted_id } = req.params;
  try {
    await Users.findByIdAndDelete(user_deleted_id);
    res.status(200).json({ message: 'Пользователь удален' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении пользователя' });
  }
});