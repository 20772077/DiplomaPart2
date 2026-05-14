<script>
import axios from 'axios';
import NavBar from './NavBar.vue';
import Button from './Button.vue';
export default {
  name: 'GameBoard',
  data() {
    return {
      X_GameField: 12,
      Y_GameField: 27,                //2.25x от X_GameField
      spriteSets:{},
      themes: ['default', 'jungle', 'desert', 'sea', 'volacno', 'city', 'mountains'], // список тем
      currentSpriteSet: 'default',    // активный набор
      potatoCount: 0,
      size: 0,
      IsWin: false,
      gameMap: [],                    // двумерный массив ячеек
      playerPos: { x: 0, y: 0 },
      potatoCountText: '',
      audio: null,
      current_user: null,
      isStoped: false,
//--- AI MODIFICATIONS ---//
      ai_game_field: []                       // многомерный "Подготовленный массив" с набором данных о положении на карте
//--- AI MODIFICATIONS ---//
    };
  },
  mounted() {
      this.loadSpritesForTheme("default").then(() => {
        this.generateGameField();
      });
      window.addEventListener('keydown', this.handleKeyDown);
      //this.$nextTick(() => {this.zoomPage();});
      //const width = window.innerWidth;
      //const height = window.innerHeight;

      //console.log(`Ширина окна: ${width}px`);
      //console.log(`Высота окна: ${height}px`);
      window.addEventListener('resize', () => {
      //console.log(`Новое ширина: ${window.innerWidth}px`);
      //console.log(`Новая высота: ${window.innerHeight}px`);
    });
      this.current_user = JSON.parse(localStorage.getItem('current_user'))
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
        //console.log(this.spriteSets[theme]);
        this.spriteSets[theme] = "";
        //console.log(this.spriteSets[theme]);
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
      cell.classes.push('Player');
      this.potatoCount = 0;
      this.potatoCountText = `${this.potatoCount}`;
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
      
      
      //ВРЕМЕННО ПОКА ТУТ//
      this.ai_prepare_prepared_array();
      //ПОТОМ ДОЛЖЕН ВЫЗЫВАТЬСЯ ИЛИ ОН, ИЛИ ЕГО ОБЛЕГЧЁННАЯ ВЕРСИЯ ДЛЯ ЗАМЕНЫ ДАННЫХ В МАССИВЕ ПЕРЕД ХОДОМ ОХОТНИКА//
      //ПОСЛЕ ХОДА ОХОТНИКА ОН (ЭТОТ ОБЛЕГЧЁННЫЙ МЕТОД) ТОЖЕ ДОЛЖЕН ВЫЗЫВАТЬСЯ ЧТОБЫ ПОМЕНЯТЬ ПОЛОЖЕНИЕ ОХОТНИКА//
      
      
      // Обновляем отображение счёта
      this.potatoCountText = /*`Collected potato:*/ `${this.potatoCount}`;
    },
    generateThings(elemIndex, param) {
      // Распределяем объекты по полю
      //из-за this.size возникают проблемы с пропажей нужной картошки
      this.size = 0;
      this.size = Math.trunc(this.X_GameField * this.Y_GameField * param);
      //console.log("size "+this.size);
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
        //
      }
    },
    movePlayer(dx, dy) {
      const newX = this.playerPos.x + dx;
      const newY = this.playerPos.y + dy;

      // Если вышли за границы
      if (newX < 0 || newX >= this.X_GameField || newY < 0 || newY >= this.Y_GameField) {
        if (this.IsWin) {
          // Игра победила, выбираем новую тему и генерируем новую карту
          // Тут же записываем в БД новые счётчики игрока - количество картофелей и динамита
          // НА ДАННЫЙ МОМЕНТ РАБОТАЕТ (17.12.25)
          const updatedData = {
              name: this.current_user.name,
              dynamite: this.current_user.dynamite,
              potatoes: this.current_user.potatoes,
              hasVictory: this.current_user.hasVictory
          };
          const user_id = this.current_user._id;
          axios.put(`/api/items/${user_id}`, updatedData)
          .then(response => {
            console.log('Update successful:', response.data);
          })
          .catch(error => {
            console.error('Error updating document:', error);
          });
          // НА ДАННЫЙ МОМЕНТ РАБОТАЕТ (17.12.25)
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
        const isDestroyed = this.useDynamite(newX, newY);
        if (isDestroyed) {
          // Стена разрушена, перемещение игрока уже сделано внутри useDynamite
          return;
        } else {
          // Не удалось разрушить
          return;
        }
      }

      // Передвижение СПРАЙТА игрока
      currentCell.classes = currentCell.classes.filter(c => c !== 'Player');
      currentCell.symbol = currentCell.originalSymbol;

      targetCell.classes.push('Player');
      targetCell.symbol = this.spriteArray[0];

      this.playerPos = { x: newX, y: newY };

      if (targetCell.hasPotato) {
        targetCell.hasPotato = false;
        targetCell.symbol = this.spriteArray[0];
        this.potatoCount += 1;
        this.current_user.potatoes += 1;
        localStorage.setItem('current_user', JSON.stringify(this.current_user));
        //this.potatoCountText = /*`Collected potato:*/ `${this.potatoCount}`;
        this.checkWin();
      }
      //ВСЕГДА ПОСЛЕ СЕБЯ БУДЕТ ОСТАВЛЯТЬ КЛЕТКУ ПО КОТОРОЙ МОЖНО ХОДИТЬ; НАДО ОТРАБОТАТЬ ПРЕПЯДСТВИЕ + НЕТ ДИНАМИТА
      this.ai_change_prepared_array_after_turn(dx,dy,newX,newY);
    },
    checkWin() {
      if (this.potatoCount >= this.size) {
        alert('You win! Moving to a new random location with a different theme.');
        this.IsWin = true;
      }
    },
    incr(){
      this.potatoCount++;
      this.potatoCountText = `${this.potatoCount}`;
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
      // ОБНОВЛЯЕМ ДАННЫЕ ИГРОКА ПЕРЕД ПЕРЕХОДОМ В ГЛАВНОЕ МЕНЮ
      // НА ДАННЫЙ МОМЕНТ РАБОТАЕТ (17.12.25)
      const updatedData = {
          name: this.current_user.name,
          dynamite: this.current_user.dynamite,
          potatoes: this.current_user.potatoes,
          hasVictory: this.current_user.hasVictory
      };
      const user_id = this.current_user._id;
      axios.put(`/api/items/${user_id}`, updatedData)
      .then(response => {
        console.log('Update successful:', response.data);
      })
      .catch(error => {
        console.error('Error updating document:', error);
      });
      // НА ДАННЫЙ МОМЕНТ РАБОТАЕТ (17.12.25)
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
    },
    useDynamite(newX, newY){
      let cell = this.gameMap[newX][newY];
      if(this.current_user.dynamite >= 1 && cell.hasStone){
        // остальные проверки и движение по карте
        const targetCell = this.gameMap[newX][newY];
        const currentCell = this.gameMap[this.playerPos.x][this.playerPos.y];

        // Передвижение игрока
        currentCell.classes = currentCell.classes.filter(c => c !== 'Player');
        currentCell.symbol = currentCell.originalSymbol;

        targetCell.classes.push('Player');
        targetCell.symbol = this.spriteArray[0];

        this.playerPos = { x: newX, y: newY };
        this.current_user.dynamite -= 1;  

        return true;    // Успешно использован динамит и разрушена стена
      
      }else { 
        return false;   // Не удалось использовать динамит
      }
    },
    manipulateShopMusic(){
                if(!this.isStoped){ // МУЗЫКА НЕ ОСТАНОВЛЕНА
                    this.isStoped = true;
                    this.currentMusic.pause();
                }
                else{
                    this.isStoped = false;
                    this.currentMusic.play();
                }
    },
    ai_prepare_prepared_array(){   
      //this.spriteSets[this.currentSpriteSet][0] - это путь к конктретному српайту в наборе спрайтов
      //console.log(this.gameMap[0][0].symbol); - это путь к конктретному српайту в игровой карте
      for (let ai_row = 0; ai_row < this.X_GameField; ai_row++) {
//--- AI MOD ---//
        this.ai_game_field[ai_row] = [];           // создаём строчку "Подготовленного массива"

        for (let ai_col = 0; ai_col < this.Y_GameField; ai_col++) {
          const ai_currentCell = this.gameMap[ai_row][ai_col].symbol;
          switch(ai_currentCell){
            
            //-- ЕСЛИ СПРАЙТ ИГРОКА --//
            case this.spriteSets[this.currentSpriteSet][0]:
              this.ai_game_field[ai_row][ai_col] = 0;
              continue;

            //-- ЕСЛИ СПРАЙТ КЛЕТКИ, ПО КОТОРОЙ МОЖНО ХОДИТЬ --//  
            case this.spriteSets[this.currentSpriteSet][1]:
              this.ai_game_field[ai_row][ai_col] = 1;
              continue;
            
            //-- ЕСЛИ СПРАЙТ КЛЕТКИ-ПРЕПЯДСТВИЯ --//
            case this.spriteSets[this.currentSpriteSet][2]:
              this.ai_game_field[ai_row][ai_col] = 2; 
              continue;
            
            //-- ЕСЛИ СПРАЙТ КАРТОШКИ --//
            case this.spriteSets[this.currentSpriteSet][3]:
              this.ai_game_field[ai_row][ai_col] = 3;    
              continue;
            
            //-- ЕСЛИ СПРАЙТ ОХОТНИКА --//
            case this.spriteSets[this.currentSpriteSet][4]:
              this.ai_game_field[ai_row][ai_col] = 4; 
              continue;
          }
        }
      } 
      // ВМЕСТО console.log() ЭТОТ "ПОДГОТОВЛЕННЫЙ МАССИВ" НАДО БУДЕТ ПОДАВАТЬ НА ВХОД МОДЕЛИ ОсП
      //console.log(this.ai_game_field);
      //--- AI MOD ---//
    },
    ai_change_prepared_array_after_turn(oldX,oldY,newX,newY){
      const startX = newX-oldX;
      const startY = newY-oldY;
      //console.log('('+ startX +"; "+ startY +") -> ("+ newX +"; "+ newY +')');
      this.ai_game_field[startX][startY] = 1;
      this.ai_game_field[newX][newY] = 0;
      //console.log(this.ai_game_field);
    }

  },
  computed: {
  backgroundStyle() {
    return {
      backgroundImage: `url(/assets/images/${this.currentSpriteSet}.png)`,
      backgroundRepeat: 'no-repeat'
    };
  }
},
  components: {
    NavBar,
    Button
  }
};

</script>

<template>
  
  <div :style="backgroundStyle" id="bod">
    <!-- Информация о собранных картошках -->
    <!--<nav class="nav-bar"></nav>-->
      <NavBar>
        <template #left>
          <div class="btn-back">
            <Button></Button>
            <button @click="manipulateShopMusic" class="music-controller">{{ isStoped ? "🔈": "🔊" }}</button>
          </div>
      </template>
      <template #right>
        <p class="username">{{ current_user?.name }}'s potato adventure</p>
        <div class="potato-balance">
          <p class="potato-count">{{ current_user?.dynamite }}&nbsp;🧨</p>
          <p class="potato-count">{{ current_user?.potatoes }}&nbsp;🥔</p>
        </div>
      </template>
      </NavBar>

  <!----- Игровое поле ----->
    <table class="centre">
      <tbody>
        <tr v-for="(row, rowIndex) in gameMap" :key="rowIndex">
          <td v-for="(cell, colIndex) in row" :key="colIndex"
              :class="cell.classes"
              :data-symbol="cell.symbol"
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
.username{
  color: wheat;
  font-family: 'MV Boli', 'Comic Sans MS';
  text-shadow: 3px 3px 6px #D0C2C3;
  margin: 0;
  font-size: 1.5rem;
}
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

.music-controller{
    background: none;
    min-height: 82px;
    font-size: 22px;
    border: none;
    transition: 0.2s;
}
.music-controller:hover{
    cursor: pointer;
    transform: scale(1.3);
}

</style>