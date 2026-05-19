<script>
import axios from 'axios';
export default {
  name: 'GameBoard',
  data() {
    return {
      X_GameField: 16,
      Y_GameField: 16,
      spriteSets:{},
      /*spriteSets2: {
        default: ['🚶🏻‍♂️','🌲','⛰️', '🥔','🌱'],
        jungle: ['🚶🏻‍♂️','🌳','🦜', '🥔','🍃'],
        desert: ['🚶🏻‍♂️','🌵','🏜️', '🥔','🌵'],
        sea: ['🏄🏻‍♂️','🌊','🏝️', '🥔','🌱'],
        volacno: ['🚶🏻‍♂️','♨','🌋', '🥔','🌱'],
        city: ['🚙','🚕','🏙️', '🥔','🌱'],
        mountains: ['🏂','🌨️','🗻', '🥔','🌱']
      },*/
      themes: ['default', 'jungle', 'desert', 'sea', 'volacno', 'city', 'mountains'], // список тем
      //spriteArray: [],
      backgroundUrl: '',
      musicUrl: '',
      currentSpriteSet: 'default', // активный набор

      //spriteArray: ['🚶🏻‍♂️','🌲','⛰️', '🥔','🌱'],
      //mapArray: ['left','right','up','down','index'],
      potatoCount: 0,
      size: 0,
      IsWin: false,
      gameMap: [], // двумерный массив ячеек
      playerPos: { x: 0, y: 0 },
      potatoCountText: '',
      audio: null,
    };
  },
  mounted() {
      this.loadSpritesForTheme("default").then(() => {
        this.generateGameField();
      });
      window.addEventListener('keydown', this.handleKeyDown);
    },
    beforeUnmount(){
      this.currentMusic.pause();
    },
  unmounted() {
    window.removeEventListener('keydown', this.handleKeyDown);
  },
  methods: {
    async loadSpritesForTheme(theme) {
      try {
        const response = await axios.get('/spritesets', { params: { location: theme } });
        const spritesArray = JSON.parse(response.data[0].sprites[0]);
        
        /*console.log("ss",spritesArray);
        const newSpriteSets = {};
        spritesArray.forEach(set => {
          newSpriteSets[set.name] = set.sprites;
          console.log(set.sprites)
        });*/
        
        //console.log(this.spriteSets[this.currentSpriteSet])
        
        this.spriteSets[theme] = spritesArray; // обновляем все спрайты
        this.currentSpriteSet = theme;
        this.spriteArray = this.spriteSets[this.currentSpriteSet];
        this.playMusic(theme);
      } catch (e) {
        console.error('Ошибка загрузки данных для темы:', e);
      }
    },
    async changeToRandomTheme() {

      // выбираем случайную тему
      const randomTheme = this.themes[Math.floor(Math.random() * this.themes.length)];
      await this.loadSpritesForTheme(randomTheme);
      this.currentTheme = randomTheme;
      this.generateGameField();

      // ставим игрока в стартовую позицию
      this.playerPos = { x: 0, y: 0 };
      
      // Помещаем игрока в новую карту
      const cell = this.gameMap[0][0];
      cell.classes = cell.classes.filter(c => c !== 'Player');
      cell.symbol = cell.originalSymbol;
      cell.classes.push('Player');
      this.potatoCount = 0;
      this.potatoCountText = `Collected potato: ${this.potatoCount}`;
    },
    
        /*async loadGameData() {
          try {
            console.log(this.currentSpriteSet);
            const response = await axios.get('/spritesets', { params: { location: this.currentSpriteSet } });
            console.log(response.data);

            const spritesArray = JSON.parse(response.data[0].sprites[0]);
            for(let i =0; i<spritesArray.length; i++){
              this.spriteSets[i.name] = spritesArray[i];
            }
            console.log(this.spriteSets);
            this.currentSpriteSet = 'default';
            this.spriteArray = this.spriteSets[this.currentSpriteSet];

          } catch (e) {
            console.error('Ошибка загрузки данных:', e);
          }
    },*/
    generateGameField() {
      const sprites = this.spriteSets[this.currentSpriteSet]; // текущий набор спрайтов
      this.spriteArray = sprites; // обновляем свойство, чтобы далее использовался правильный набор
      // Создаём массив и заполняем ячейки
      this.gameMap = [];
      for (let a = 0; a < this.X_GameField; a++) {
        const row = [];
        for (let b = 0; b < this.Y_GameField; b++) {
          row.push({
            symbol: (a === 0 && b === 0) ? this.spriteArray[0] : this.spriteArray[1],
            originalSymbol: this.spriteArray[1],
            classes: [
              `x${a}y${b}`,
              'elem'
            ],
            position: { x: a, y: b },
            hasPotato: false,
            hasStone: false,
          });
        }
        this.gameMap.push(row);
      }
      // Изначально позиция игрока
      this.playerPos = { x: 0, y: 0 };
      // Установите класс для стартовой ячейки
      const startCell = this.gameMap[0][0];
      startCell.classes.push('Player');
      this.generateThings(2, 0.2); // Камни
      this.generateThings(3, 0.01); // Картошка

      // Обновляем отображение счёта
      this.potatoCountText = `Collected potato: ${this.potatoCount}`;
    },

    generateThings(elemIndex, param) {
      // Распределяем объекты по полю
      this.size = Math.floor(this.X_GameField * this.Y_GameField * param);
      for (let i = 0; i < this.size; i++) {
        const X = Math.floor(Math.random() * this.X_GameField);
        const Y = Math.floor(Math.random() * this.Y_GameField);
        if (X === 0 && Y === 0) continue; // не перекрывать старт
        const cell = this.gameMap[X][Y];
        // Проверяем, чтобы на ячейке не было уже чего-то
        if (!cell.hasPotato && !cell.hasStone && cell.symbol !== this.spriteArray[2]) {
          if (elemIndex === 3) {
            cell.hasPotato = true; // отметка, что есть картошка
            // Изменяем символ, чтобы отображать картошку
            cell.symbol = this.spriteArray[3];
          } else if (elemIndex === 2) {
            cell.hasStone = true; // отметка, что есть камень
            cell.symbol = this.spriteArray[2];
          }
      }
    }
  },

    handleCellClick(rowIdx, colIdx) {
      // Тут можно реализовать движения по клику, если нужно
    },

    handleKeyDown(e) {
      //console.log('Key pressed:', e.key);
      const keyMap = {
        'ArrowLeft': [0, -1],
        'ArrowRight': [0, 1],
        'ArrowUp': [-1, 0],
        'ArrowDown': [1, 0]
      };
      const move = keyMap[e.key];
      if (move) {
        this.movePlayer(move[0], move[1]);
      }
    },

    movePlayer(dx, dy) {
      const newX = this.playerPos.x + dx;
      const newY = this.playerPos.y + dy;

      // Если вышли за границы
      if (newX < 0 || newX >= this.X_GameField || newY < 0 || newY >= this.Y_GameField) {
        if (this.IsWin) {
          // Игра победила, выбираем новую тему и генерируем новую карту
          this.changeToRandomTheme();
          this.IsWin = false;
        }
        return;
      }

      // остальные проверки и движение по карте...
      const targetCell = this.gameMap[newX][newY];
      const currentCell = this.gameMap[this.playerPos.x][this.playerPos.y];

      if (targetCell.symbol === this.spriteArray[2]) {
        // стена
        return;
      }

      // Передвижение игрока
      currentCell.classes = currentCell.classes.filter(c => c !== 'Player');
      currentCell.symbol = currentCell.originalSymbol;

      targetCell.classes.push('Player');
      targetCell.symbol = this.spriteArray[0];

      this.playerPos = { x: newX, y: newY };

      if (targetCell.hasPotato) {
        targetCell.hasPotato = false;
        targetCell.symbol = this.spriteArray[0];
        this.potatoCount += 1;
        this.potatoCountText = `Collected potato: ${this.potatoCount}`;
        this.checkWin();
      }
    },

    checkWin() {
      if (this.potatoCount >= this.size) {
        alert('You win! Moving to a new random location with a different theme.');
        this.IsWin = true;
      }
    },
    incr(){
      //console.log(this.potatoCount);
      //console.log(this.size);
      this.potatoCount++;
      this.potatoCountText = `Collected potato: ${this.potatoCount}`;
      this.checkWin();
    },
    playMusic(theme) {
      if (this.currentMusic) {
        this.currentMusic.pause();
      }
      this.currentMusic = new Audio(`/assets/music/${theme}.mp3`);
      this.currentMusic.loop = true;
      this.currentMusic.play();
    },
    playFirstTime(){
      this.playMusic("default");
    }

  },
  computed: {
  backgroundStyle() {
    return {
      backgroundImage: `url(/assets/images/${this.currentSpriteSet}.png)`,
      backgroundRepeat: 'no-repeat'
    };
  }
}
};

</script>

<template>
  
  <div :style="backgroundStyle" id="bod">
    <!-- Информация о собранных картошках -->
    <p class="centreP">{{ potatoCountText }}</p>

    <!-- Игровое поле -->
    <table class="centre">
      <tbody>
        <tr v-for="(row, rowIndex) in gameMap" :key="rowIndex">
          <td v-for="(cell, colIndex) in row" :key="colIndex"
              :class="cell.classes"
              @keydown="handleKeyDown($event)">
            {{ cell.symbol }}
          </td>
        </tr>
      </tbody>
    </table>
    <button @click="incr()">add</button><button @click="playMusic('default')" ref="palyBtn" type="button">play</button>
  </div>
  
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}

.elem{
    /*background-color: rgb(113, 88, 66);*/
    background-color: rgba(52, 35, 21, 0.637);
    padding: 2px 2px 2px 2px;
}
.centre{
    margin-left: auto;
    margin-right: auto;
}
#bod{
  width: 100vw;             /* ширина 100% от viewport */
  height: 100vh;            /* высота 100% от viewport */
  background-position: center; /* центрирование изображения */
  background-size: cover;      /* масштабирование для покрытия всего блока */
  transition: background-image 0.7s ease;
    /*background-image: url('../../assets/images/default.png');
    background-repeat: no-repeat;*/
}
.centreP{
    text-align: center;
    color: #8ae97f;
    background-color: rgba(46, 56, 44, 0.4);
}
#leftBod{
    background-image: url(/volcano.png);
    background-repeat: no-repeat;
}
#rightBod{
    background-image: url(/city.png);
    background-repeat: no-repeat;
}
#downBod{
    background-image: url(/sufr.png);
    background-repeat: no-repeat;
}
#upBod{
    background-image: url(/mountans.png);
    background-repeat: no-repeat;
}
</style>
