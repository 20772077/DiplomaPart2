let express = require(`express`);
const fs = require('fs').promises;
const path = require('path');

let app = express();
let PORT = 3005;

// Настройка CORS
let cors = require('cors');
app.use(cors({ origin: 'http://localhost:5173' }));

// Настройка POST-запроса — JSON
app.use(express.json());
app.listen(PORT, function () {
    console.log(`http://localhost:${PORT}`);
});



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
  }catch (err){
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

// На сервере (Работа с моделью)

app.post('/api/save-model', async (req, res) => {
    console.log('📥 Получен запрос на сохранение модели');
    console.log('Размер данных:', JSON.stringify(req.body).length, 'байт');
    console.log('Структура:', Object.keys(req.body));
  const modelData = req.body;
  await fs.writeFile(
    path.join(__dirname, 'hunter-ai-model.json'),
    JSON.stringify(modelData)  // ← Нужно преобразовать в строку!
  );
  res.json({ success: true });
});

app.get('/api/load-model', async (req, res) => {
    try {
        const modelPath = path.join(__dirname, 'hunter-ai-model.json');
        const data = await fs.readFile(modelPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (e) {
        res.status(404).json({ error: 'Модель не найдена' });
    }
});


//статистика

const statsFilePath = path.join(__dirname, 'data', 'stats.txt');
const totalStatsFilePath = path.join(__dirname, 'data', 'totalStats.txt');

async function readStats() {
    try {
        const data = await fs.readFile(statsFilePath, 'utf8');
        const parts = data.trim().split(' ');
        return {
            chooseSearch: parseInt(parts[0]) || 0,
            chooseExploit: parseInt(parts[1]) || 0,
            games: parseInt(parts[2]) || 0,
            catches: parseInt(parts[3]) || 0
        };
    } catch (err) {
        // Если файла нет — возвращаем нули
        return { chooseSearch: 0, chooseExploit: 0, games: 0, catches: 0 };
    }
}
async function writeStats(stats) {
    const line = `${stats.chooseSearch} ${stats.chooseExploit} ${stats.games} ${stats.catches}`;
    await fs.writeFile(statsFilePath, line, 'utf8');
}
async function writeTotalStats(stats) {
    const line = `${stats.chooseSearch} ${stats.chooseExploit} ${stats.games} ${stats.catches} \n`;
    await fs.appendFile(totalStatsFilePath, line, 'utf8');
}

// Получить статистику
app.get('/api/stats', async (req, res) => {
    const stats = await readStats();
    res.json(stats);
});

// Сохранить статистику
app.post('/api/stats', async (req, res) => {
    const stats = req.body;
    console.log('STATS:', stats);
    await writeTotalStats(stats);
    const oldStats = await readStats();

    const summedStats = {
        chooseSearch: oldStats.chooseSearch + stats.chooseSearch,
        chooseExploit: oldStats.chooseExploit + stats.chooseExploit,
        games: oldStats.games + stats.games,
        catches: oldStats.catches + stats.catches
    };
    
    await writeStats(summedStats);
    res.json({ message: 'Stats saved' });
});