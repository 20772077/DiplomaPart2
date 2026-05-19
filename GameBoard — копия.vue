<script>
import axios from 'axios';
export default {
  name: 'GameBoard',
  data() {
    return {
      X_GameField: 12,
      Y_GameField: 27, //2.25x от X_GameField
      spriteSets:{},
      themes: ['default', 'jungle', 'desert', 'sea', 'volacno', 'city', 'mountains'], // список тем
      currentSpriteSet: 'default', // активный набор
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
      //this.$nextTick(() => {this.zoomPage();});
      const width = window.innerWidth;
      const height = window.innerHeight;

      console.log(`Ширина окна: ${width}px`);
      console.log(`Высота окна: ${height}px`);
          window.addEventListener('resize', () => {
      console.log(`Новое ширина: ${window.innerWidth}px`);
      console.log(`Новая высота: ${window.innerHeight}px`);
    });
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
        console.log(this.spriteSets[theme]);
        this.spriteSets[theme] = "";
        console.log(this.spriteSets[theme]);
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
      this.potatoCountText = /*`Collected potato:*/ `${this.potatoCount}`;
    },
    generateGameField() {
      const sprites = this.spriteSets[this.currentSpriteSet];   // текущий набор спрайтов
      this.spriteArray = sprites;                               // обновляем свойство, чтобы далее использовался правильный набор
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
      // Установка класса для стартовой ячейки
      const startCell = this.gameMap[0][0];
      startCell.classes.push('Player');
      this.generateThings(2, 0.2);            // Камни
      this.generateThings(3, 0.01);           // Картошка

      // Обновляем отображение счёта
      this.potatoCountText = /*`Collected potato:*/ `${this.potatoCount}`;
    },
    generateThings(elemIndex, param) {
      // Распределяем объекты по полю
      //из-за this.size возникают проблемы с пропажей нужной картошки
      this.size = 0;
      this.size = Math.trunc(this.X_GameField * this.Y_GameField * param);
      console.log("size "+this.size);
      let amount_of_thing_set = 0;
      let maxAttempts = 10000;                      // максимально допустимое число попыток
      let attempts = 0;

      while(amount_of_thing_set < this.size && attempts < maxAttempts){
        let X = Math.floor(Math.random() * this.X_GameField);
        let Y = Math.floor(Math.random() * this.Y_GameField);
        
        //фикс софт-лока старта - не трогаем ячейки (0;0) (1;0) (0;1) (1;1)
        if (X >= 0 && X <= 1 && Y >= 0 && Y <= 1) continue;

        let cell = this.gameMap[X][Y];

        // Проверяем, чтобы на ячейке не было уже чего-то        
        if (!cell.hasPotato && !cell.hasStone && cell.symbol !== this.spriteArray[2] && cell.symbol !== this.spriteArray[3]) {
          if (elemIndex === 3) {
            
            cell.hasPotato = true;                  // отметка, что есть картошка          
            cell.symbol = this.spriteArray[3];      // Изменяем символ, чтобы отображать картошку
            amount_of_thing_set += 1;
            
            console.log("коодринаты картошки: "+cell.position.x+" "+ cell.position.y+" "+cell.symbol);
          
          } else if (elemIndex === 2) {
            
            cell.hasStone = true;                   // отметка, что есть камень
            cell.symbol = this.spriteArray[2];
            amount_of_thing_set += 1;
          }
      }
        if (attempts >= maxAttempts) {
    console.warn("Достигнут лимит попыток, размещение может быть неполным.");
  }
    }
    },
    handleKeyDown(e) {
      const keyMap = {
        'ArrowLeft': [0, -1],
        'ArrowRight': [0, 1],
        'ArrowUp': [-1, 0],
        'ArrowDown': [1, 0],
        'a': [0, -1],
        'd': [0, 1],
        'w': [-1, 0],
        's': [1, 0]
      };
      const move = keyMap[e.key];
      if (move) {
        this.movePlayer(move[0], move[1]);
        //передвинуть охотника
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

      // остальные проверки и движение по карте
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
        this.potatoCountText = /*`Collected potato:*/ `${this.potatoCount}`;
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
      this.potatoCount++;
      this.potatoCountText = /*`Collected potato:*/ `${this.potatoCount}`;
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
    },
    GoToMainMenu(){
                  this.$router.push({
                    name: 'mainmenu'
                })
    },
    zoomPage() {
      // Устанавливаем масштаб 120%
      document.body.style.zoom = '120%';
      // Альтернативный вариант для кроссбраузерности
      document.body.style.MozTransform = 'scale(1.2)';
      document.body.style.transform = 'scale(1.2)';
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
    <nav class="nav-bar">
      <div class="btn-back">
        <button @click="GoToMainMenu" type="button" class="btn-main-menu">Main Menu</button>
      </div>
      <div class="potato-balance">
        <p class="potato-count">🥔{{ potatoCountText }}</p>
      </div>
    </nav>

  <!----- Игровое поле ----->
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
      <!--<button @click="incr()">add</button>-->
      <!--<button @click="playMusic('default')" ref="palyBtn" type="button">play</button>-->
  </div>
  
</template>

<style scoped>
.elem{
    background-color: rgba(52, 35, 21, 0.637);
    padding: 2px 2px 2px 2px;
}
.centre{
    margin-left: auto;
    margin-right: auto;
}
#bod{
  width: 100vw;                           /* ширина 100% от viewport */
  height: 100vh;                          /* высота 100% от viewport */
  background-position: center;            /* центрирование изображения */
  background-size: cover;                 /* масштабирование для покрытия всего блока */
  transition: background-image 0.7s ease;
  flex-direction: column;                 /* Располагаем содержимое по колонкам */
  align-items: center;                    /* Центрируем по горизонтали */
}
.potato-count{
    font-family: 'MV Boli', 'Comic Sans MS';
    text-shadow: 3px 3px 6px #D0C2C3;
    margin: 0;
    font-size: 1.5rem;
    color: #c7b9af;
}
table {
  transform: scale(1.5);
  transform-origin: top center; /* чтобы масштабирование начиналось с верхнего левого угла */
}
/* Новые стили для контейнера кнопок */
.buttons-container {
  display: flex;
  gap: 10px;                    /* расстояние между кнопками */
  margin-top: 20px;             /* отступ сверху от таблицы, если нужно */
}
/*.nav-bar{
    width: 100vw;
    padding: 2vw;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: rgba(46, 56, 44, 0.4);
    max-height: 85px;
}*/
.btn-main-menu{
  font-family: 'MV Boli', 'Comic Sans MS';
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  color: #A08D8F;
  font-size: 22px;
  min-height: 85px;
  transition: 0.2s;
  text-shadow: 3px 3px 9px #D0C2C3;
}
.btn-main-menu:hover{
  color: #c7b9af;
  background-color: rgba(92, 112, 88, 0.6);
  transform: scale(1.05);
}
</style>