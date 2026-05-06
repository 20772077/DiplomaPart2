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

const backgroundSchema = new mongoose.Schema({
        name: { type: String, unique: true },
        imageUrl: { type: String }
    });

module.exports = mongoose.model('Background', backgroundSchema);

let Background = mongoose.model('Background', backgroundSchema);

const musicTrackSchema = new mongoose.Schema({
    name: { type: String },
    fileUrl: { type: String }
  });
  
module.exports = mongoose.model('MusicTrack', musicTrackSchema);

let Music = mongoose.model('MusicTrack', musicTrackSchema);



// Получить все наборы спрайтов
app.get('/spritesets', async (req, res) => {
  let location = req.query.location;
  console.log(req.location);
  const sets = await Sprites.find({'name': location}, {sprites:1});
  console.log(sets);
  res.send(sets);
});

// Получить все фоны
app.get('/backgrounds', async (req, res) => {
  const backgrounds = await Background.find();
  res.json(backgrounds);
});

// Получить все музыкальные треки
app.get('/music', async (req, res) => {
  const tracks = await Music.find();
  res.json(tracks);
});