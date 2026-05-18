<script>
import axios from 'axios';
import NavBar from './NavBar.vue';
import Button from './Button.vue';
import * as tf from '@tensorflow/tfjs';
import HunterRLM from './../../services/hunter';
export default {
  name: 'GameBoard',
  data() {
    return {
      X_GameField: 12,                // КОЛИЧЕСТВО СТРОК
      Y_GameField: 27,                // КОЛИЧЕСТВО СТОЛБЦОВ 2.25x от X_GameField
      spriteSets:{},
      themes: ['default', 'jungle', 'desert', 'sea', 'volcano', 'city', 'mountains'], // список тем
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
      ai_game_field: [],                       // многомерный "Подготовленный массив" с набором данных о положении на карте
      hunterAIReady: false, // Охотник будет жить здесь
      isLearning: false,
      isGameOver: false,
//--- AI MODIFICATIONS ---//
    };
  },
  created(){
    this.hunterAI = null // не должен быть реактивным
  },
  async mounted() {
      await this.loadSpritesForTheme("default").then(() => {this.generateGameField();});
      window.addEventListener('keydown', this.handleKeyDown);
      this.current_user = JSON.parse(localStorage.getItem('current_user'));
      await this.loadModelFromServer();
    },
 async beforeUnmount(){
      this.currentMusic.pause();
                        // обучение модели
      if (this.isGameOver == true){
        ////====STATS====////
        /*console.log('Перед сохранением:', {
          chooseSearch: this.hunterAI?.chooseSearch,
          chooseExploit: this.hunterAI?.chooseExploit,
          games: this.hunterAI?.games,
          catches: this.hunterAI?.catch
        });*/
        let statsData = {
          chooseSearch: this.hunterAI.chooseSearch,
          chooseExploit: this.hunterAI.chooseExploit,
          games: this.hunterAI.games,
          catches: this.hunterAI.catches
        };
        console.log('Перед сохранением:', {
          chooseSearch: statsData.chooseSearch,
          chooseExploit: statsData.chooseExploit,
          games: statsData.games,
          catches: statsData.catches
        });
        if ((this.hunterAI?.games || 0) > 0 && (this.hunterAI.chooseSearch + this.hunterAI.chooseExploit > 0)) {
          await axios.post('/api/stats', statsData);
        }
        this.hunterAI.chooseSearch = 0;
        this.hunterAI.chooseExploit = 0;
        this.hunterAI.catches = 0;
        this.hunterAI.games = 0;
        ////====STATS====////
        this.isGameOver = false;   
        this.saveData();
        if (this.hunterAI && this.hunterAI.memory && this.hunterAI.memory.length > 0) {
              this.isLearning = true;
              const batchSize = Math.min(this.hunterAI.memory.length, 128);
              await this.hunterAI.replay(batchSize).then(() => {
          });
        }
      }
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
        //this.spriteSets[theme] = "";
        //console.log(this.spriteSets[theme]);
        this.spriteSets[theme] = spritesArray; // обновляем все спрайты
        this.currentSpriteSet = theme;
        this.spriteArray = this.spriteSets[this.currentSpriteSet];
        this.playMusic(theme);
        //this.hunterAI.model.summary();
      } catch (e) {
        console.error('Ошибка загрузки данных для темы:', e);
      }
    },
    async changeToRandomTheme() {
      ////====STATS====////
      let statsData = {
        chooseSearch: this.hunterAI.chooseSearch,
        chooseExploit: this.hunterAI.chooseExploit,
        games: this.hunterAI.games,
        catches: this.hunterAI.catches
      }
      const query = await axios.post('/api/stats', statsData);
      ////====STATS====////
      // выбираем случайную тему
      let randomTheme = this.themes[Math.floor(Math.random() * this.themes.length)];
      await this.loadSpritesForTheme(randomTheme);
      this.currentSpriteSet = randomTheme;
      this.generateGameField();

      // ставим игрока в стартовую позицию
      this.playerPos = { x: 0, y: 0 };
      
      // Помещаем игрока в новую карту
      const cell = this.gameMap[0][0];
      cell.classes = cell.classes.filter(c => c !== 'Player');
      cell.classes.push('Player');
      this.potatoCount = 0;
      this.potatoCountText = `${this.potatoCount}`;
      
      //Сброс позиции охотника
      if (this.hunterAI) {
        // Старая позиция охотника (очищаем спрайт)
        const oldHunterPos = this.hunterAI.getHunterPosition();
        if (oldHunterPos) {
          const oldRow = oldHunterPos.yPos;
          const oldCol = oldHunterPos.xPos;
          const oldCell = this.gameMap[oldRow]?.[oldCol];
          if (oldCell) {
            oldCell.classes = oldCell.classes.filter(c => c !== 'Hunter');
            oldCell.symbol = oldCell.originalSymbol;
          }
        }
      }
        // Новая позиция охотника (правый нижний угол)
        const newRow = this.X_GameField - 1;
        const newCol = this.Y_GameField - 1;

        const newHunterCell = this.gameMap[newRow][newCol];
        newHunterCell.classes.push('Hunter');
        newHunterCell.symbol = this.spriteArray[4];

        // Обновляем hunterAI
        this.hunterAI.hunterPosition = [{ xPos: newCol, yPos: newRow }];


              /////
        // обучение модели
        if (this.hunterAI && this.hunterAI.memory && this.hunterAI.memory.length > 0) {
          this.isLearning = true;
          const batchSize = Math.min(this.hunterAI.memory.length, 128);
          await this.hunterAI.replay(batchSize).then(() => {
        alert('Охотник стал умнее...');
    });
          
          
        }

        /////
    },
    generateGameField() {
      const sprites = this.spriteSets[this.currentSpriteSet];   // текущий набор спрайтов
      if (!sprites) {
        console.error('❌ Нет спрайтов для темы:', this.currentSpriteSet);
        sprites = 'volcano';
    }
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
      const startCellHunter = this.gameMap[this.X_GameField-1][this.Y_GameField-1];
      startCellHunter.classes.push('Hunter');
      this.generateThings(2, 0.2);            // Камни
      this.generateThings(3, 0.01);           // Картошка
      this.generateThings(4, 1);              // охотник
      
      //ВРЕМЕННО ПОКА ТУТ//
      this.ai_prepare_prepared_array();
      //ПОТОМ ДОЛЖЕН ВЫЗЫВАТЬСЯ ИЛИ ОН, ИЛИ ЕГО ОБЛЕГЧЁННАЯ ВЕРСИЯ ДЛЯ ЗАМЕНЫ ДАННЫХ В МАССИВЕ ПЕРЕД ХОДОМ ОХОТНИКА//
      //ПОСЛЕ ХОДА ОХОТНИКА ОН (ЭТОТ ОБЛЕГЧЁННЫЙ МЕТОД) ТОЖЕ ДОЛЖЕН ВЫЗЫВАТЬСЯ ЧТОБЫ ПОМЕНЯТЬ ПОЛОЖЕНИЕ ОХОТНИКА//

      
      // Обновляем отображение счёта
      this.potatoCountText = /*`Collected potato:*/ `${this.potatoCount}`;
      console.log('📍 Охотник стартует:', { x: this.X_GameField - 1, y: this.Y_GameField - 1 });
      console.log('📍 Игрок стартует:', { x: 0, y: 0 });
    // >>> ИНИЦИАЛИЗАЦИЯ ОХОТНИКА ЗДЕСЬ <<<
        //this.initHunter();
      //this.resetHunter();
    },
    generateThings(elemIndex, param) {
      // Распределяем объекты по полю
      //из-за this.size возникают проблемы с пропажей нужной картошки
      if(param == 1){
        let cell = this.gameMap[this.X_GameField-1][this.Y_GameField-1]; 
        cell.symbol = this.spriteArray[4];
        return;
      }
      this.size = 0;
      this.size = Math.trunc(this.X_GameField * this.Y_GameField * param);
      //console.log("size "+this.size);
      let amount_of_thing_set = 0;
      let maxAttempts = this.X_GameField*this.Y_GameField*2;            // максимально допустимое число попыток
      let attempts = 0;

      while(amount_of_thing_set < this.size && attempts < maxAttempts){
        let X = Math.floor(Math.random() * this.X_GameField);
        let Y = Math.floor(Math.random() * this.Y_GameField);
        
        //фикс софт-лока старта - не трогаем ячейки (0;0) (1;0) (0;1) (1;1)
        if (X >= 0 && X <= 1 && Y >= 0 && Y <= 1) continue;
        
        //фикс софт-лока старта - не трогаем ячейки (26;11) (26;10) (25;10) (25;11)
        const HUNTER_START_X = this.X_GameField - 1; // 11
        const HUNTER_START_Y = this.Y_GameField - 1; // 26
        if ((X === HUNTER_START_X || X === HUNTER_START_X - 1) && (Y === HUNTER_START_Y || Y === HUNTER_START_Y - 1)) continue;
        let cell = this.gameMap[X][Y];

        // Проверяем, чтобы на ячейке не было уже чего-то        
        if (!cell.hasPotato && !cell.hasStone && cell.symbol !== this.spriteArray[2] && cell.symbol !== this.spriteArray[3]) {
          if (elemIndex === 3) {
            
            cell.hasPotato = true;                  // отметка, что есть картошка          
            cell.symbol = this.spriteArray[3];      // Изменяем символ, чтобы отображать картошку
            amount_of_thing_set += 1;
            
            //console.log("координаты картошки: "+cell.position.x+" "+ cell.position.y+" "+cell.symbol);
          
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
        's': [1, 0],
        'ф': [0, -1],
        'в': [0, 1],
        'ц': [-1, 0],
        'ы': [1, 0]
      };
      const move = keyMap[e.key];
      if (move) {
        this.movePlayer(move[0], move[1]);
        //передвинуть охотника
        //
      }
    },
    movePlayer(dx, dy) {
      const oldX = this.playerPos.x;
      const oldY = this.playerPos.y;
      const newX = this.playerPos.x + dx;
      const newY = this.playerPos.y + dy;

      // Если вышли за границы
      if (newX < 0 || newX >= this.X_GameField || newY < 0 || newY >= this.Y_GameField) {
        if (this.IsWin) {
          // Игрок победил, выбираем новую тему и генерируем новую карту
          // Тут же записываем в БД новые счётчики игрока - количество картофелей и динамита
          this.saveData();
          ////====STATS====////
          this.hunterAI.games++;
          ////====STATS====////
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

      if (targetCell.symbol === this.spriteArray[4]) {
        if (this.current_user.potatoes >= 2){
            this.current_user.potatoes -= 2;
            this.potatoCount = this.current_user.potatoes;
            localStorage.setItem('current_user', JSON.stringify(this.current_user));
          }else{
            this.current_user.potatoes = 0;
            this.potatoCount = this.current_user.potatoes;
            localStorage.setItem('current_user', JSON.stringify(this.current_user));
          }
        this.hunterAI.games++;
        this.hunterAI.catches++;
        alert("Охотник поймал Вас!" + this.hunterAI.catches);
          this.isGameOver = true;
          this.$router.push({
                    name: 'mainmenu'
                });
        return;
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
        this.checkWin();
      }
      //ВСЕГДА ПОСЛЕ СЕБЯ БУДЕТ ОСТАВЛЯТЬ КЛЕТКУ ПО КОТОРОЙ МОЖНО ХОДИТЬ;
      this.ai_prepare_prepared_array();
      this.ai_change_prepared_array_after_turn(oldX,oldY,newX,newY);
      this.$forceUpdate(); // Чтобы туман перерисовался
    },
    async checkWin() {
      if (this.potatoCount >= this.size) {
        if (this.hunterAI && this.hunterAI.model) { 
          ////====STATS====////
        this.hunterAI.games++;
          ////====STATS====////
        await this.saveModelToServer();}
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
      this.saveData();
      /*const updatedData = {
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
      })*/
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

        localStorage.setItem('current_user', JSON.stringify(this.current_user));
        this.audio = new Audio(`/assets/music/dynamitesound.mp3`);
        this.audio.loop = false;
        this.audio.play();
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
    async loadModelFromServer(){
      try{
        const response = await axios.get('/api/load-model');
        const modelData = response.data;

        // Если охотника нет - то создаём его
        if (!this.hunterAI){
          this.hunterAI = new HunterRLM(this.X_GameField, this.Y_GameField);
        }

        const success = await this.hunterAI.importModelFromJSON(modelData);

        if (success){
            // Компилируем модель
            this.hunterAI.model.compile({
                optimizer: tf.train.adam(this.hunterAI.learningRate),
                loss: 'meanSquaredError'
            });

            // ВАЖНО: Убеждаемся, что gameMap уже создан
            if (!this.gameMap || this.gameMap.length === 0) {
                console.error('gameMap не готов!');
                return;
            }
            // Устанавливаем начальную позицию
            const startPos = {
                xPos: this.Y_GameField - 1,
                yPos: this.X_GameField - 1
            };
            this.hunterAI.hunterPosition = [startPos];
            this.ai_prepare_prepared_array();
            this.hunterAI.setGameField(this.ai_game_field);
            this.hunterAI.setPlayerPosition();
            this.hunterAI.setPotatoPosition(); 
            this.hunterAI.setHunterPosition();
            this.hunterAIReady = true;
            console.log(this.hunterAI);
        }
        else{
          await this.createNewHunter();
        }
      }
      catch(e){
        console.error(e);
        await this.createNewHunter();
      }
    },
    async createNewHunter() {
      this.hunterAI = new HunterRLM(this.X_GameField, this.Y_GameField);
      await this.hunterAI.buildModel();
      
      const startPos = {
          xPos: this.Y_GameField - 1,
          yPos: this.X_GameField - 1
      };
      this.hunterAI.hunterPosition = [startPos];
      
      this.ai_prepare_prepared_array();
      this.hunterAI.setGameField(this.ai_game_field);
      this.hunterAI.setPlayerPosition();
      this.hunterAI.setPotatoPosition();
      this.hunterAI.setHunterPosition();
      
      this.hunterAIReady = true;
      console.log('✅ Создан новый охотник');
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
    // Вспомогательный метод для получения action из направления
    getActionFromDirection(dx, dy){
      if (dx === 0 && dy === -1) { return 0; }  // влево
      if (dx === 0 && dy === 1) { return 1; }  // вправо
      if (dx === -1 && dy === 0) { return 2; }  // вверх
      if (dx === 1 && dy === 0) { return 3; }  // вниз
      return 0;
    },
    async ai_change_prepared_array_after_turn(oldX,oldY,newX,newY){
      if (!this.playerPos || !this.hunterAI) {
        return; // Игрок уже ушёл, охотнику не нужно ходить
      }
      if(!this.hunterAI){
        console.error("AI is not detected");
        return;
      }
      // 1. Получаем текущую позицию ОХОТНИКА
      const hunterPos = this.hunterAI.getHunterPosition();
      const hunterRow = hunterPos.yPos;  // строка
      const hunterCol = hunterPos.xPos;  // столбец
      

      this.ai_game_field[oldX][oldY] = 1;
      this.ai_game_field[newX][newY] = 0;

      // 3. Убеждаемся, что охотник правильно отображается в ai_game_field
      // (его позиция уже должна быть 4, но на всякий случай проверим)
      if (this.ai_game_field[hunterRow][hunterCol] !== 4) {
        console.warn('Охотник потерялся в ai_game_field!');
        this.ai_game_field[hunterRow][hunterCol] = 4;
      }
    
      this.hunterAI.setGameField(this.ai_game_field);
      
      this.hunterAI.setPlayerPosition();
      this.hunterAI.setPotatoPosition();
      this.hunterAI.setHunterPosition();

      
      //hunter.getGameField();
      const currentState = this.hunterAI.getStateFromGrid();
      console.log('Состояние для нейросети:', currentState);
      
      const action = await this.hunterAI.chooseAction(currentState);
      let hunterDx = 0;
      let hunterDy = 0;
      switch(action){
        case 0: hunterDy = -1; break; // влево
        case 1: hunterDy = 1; break; // вправо
        case 2: hunterDx = -1; break; // вверх
        case 3: hunterDx = 1; break; // вниз
      }
      console.log('=== ОБНОВЛЕНИЕ AI FIELD ===');
      console.log('Игрок был:', oldX, oldY);
      console.log('Игрок стал:', newX, newY);
      console.log('Охотник в ai_game_field:', this.ai_game_field[hunterRow][hunterCol]);
      console.log('Игрок в ai_game_field:', this.ai_game_field[newX][newY]);
      //console.log('Охотник двигается:', hunterDx, hunterDy);
      this.moveHunter(hunterDx, hunterDy, this.hunterAI);
    },
    moveHunter(dx, dy, hunterAI_){
      // ИСПРАВЛЕНО: Правильное преобразование координат
      // positionBefore: { xPos: столбец, yPos: строка }
      const oldRow = hunterAI_.getHunterPosition().yPos;     // строка (для gameMap первый индекс)
      const oldCol = hunterAI_.getHunterPosition().xPos;     // столбец (для gameMap второй индекс)
      // Получение состояния ДО движения (для обучения)
      const state = hunterAI_.getStateFromGrid();
      const action = this.getActionFromDirection(dx, dy);

      const newRow = oldRow + dx;  // dx - движение по вертикали
      const newCol = oldCol + dy;  // dy - движение по горизонтали
      //console.log(`Движение: (${oldRow}, ${oldCol}) -> (${newRow}, ${newCol})`);

      let reward = 0;
      let done = false;
      // Если вышли за границы
      if (newRow < 0 || newRow >= this.X_GameField || newCol < 0 || newCol >= this.Y_GameField) {
        reward = -1;    // Наказание за выход за границы
        hunterAI_.hunterPosition = [{xPos: oldCol, yPos: oldRow}];
        done = true;
      }
      else if(this.gameMap[newRow][newCol].symbol === this.spriteArray[3]){
        reward = -0.2;    // Наказание за врезание в картошку
        this.ai_game_field[oldRow][oldCol] = 4;  // 4 - охотник
        hunterAI_.hunterPosition = [{xPos: oldCol, yPos: oldRow}];
        done = false;
      }

      // остальные проверки и движение по карте

      else if (this.gameMap[newRow][newCol].symbol === this.spriteArray[2]) {
      // стена
        reward = -1;    // Наказание за врезание в стену
        this.ai_game_field[oldRow][oldCol] = 4;  // 4 - охотник
        hunterAI_.hunterPosition = [{xPos: oldCol, yPos: oldRow}];
        done = true;
      }
      // Успешное движение
      else{

        const playerPos_ = this.playerPos;

        const oldDist = Math.abs(oldRow - playerPos_.x) + Math.abs(oldCol - playerPos_.y);

        const newDist = Math.abs(newRow - playerPos_.x) + Math.abs(newCol - playerPos_.y);

        // Выдача награды за приближение к игроку
        // 1. Если расстояние уменьшилось
        if (newDist < oldDist){
          reward = 1.8;           // Хорошо, приближение к игроку
          // Бонус за движение в сторону игрока
          // Расстояние до игрока по горизонтали
          const oldHorDist = Math.abs(playerPos_.y - oldCol);
          const newHorDist = Math.abs(playerPos_.y - newCol);

          // Расстояние до игрока по вертикали
          const oldVerDist = Math.abs(playerPos_.x - oldRow);
          const newVerDist = Math.abs(playerPos_.x - newRow);

          // Бонус за приближение по горизонтали
          if (newHorDist < oldHorDist) {
            reward += 0.3;
          }
          // Бонус за приближение по вертикали
          if (newVerDist < oldVerDist) {
            reward += 0.3;
          }
          hunterAI_.stepsTowardsPlayer = 0;
        } 
        // 2. Если расстояние увеличилось
        else if (newDist > oldDist){
          reward = -0.8;        // Плохо, отдаление от игрока
          hunterAI_.stepsTowardsPlayer++;
        } 
        // 3. Расстояние не изменилось 
        else {
          reward = -0.2;        // Топтание на месте
          hunterAI_.stepsTowardsPlayer++;
        }
        // 4. Если долго не может приблизиться (10+ шагов без прогресса)
        if (hunterAI_.stepsTowardsPlayer > 10) {
          reward -= 0.5;
          console.log(`⚠️ ${this.stepsTowardsPlayer} шагов без приближения — штраф`);
          hunterAI_.stepsTowardsPlayer = 0;
        }
        // 5. Если охотник очень близко (расстояние 1 или 2)
        if (newDist <= 2) {
          // Бонус за агрессивное преследование
          reward += 0.3;
        }
        // Бонус за смену позиции (исследование нового состояния)
        if (oldRow !== newRow || oldCol !== newCol) {
          reward += 0.2;  // небольшой бонус за любое движение
        }
        // После расчёта награды
        if (newDist >= oldDist) {  // не приблизился или отдалился
          hunterAI_.stepsWithoutApproach++;
          if (hunterAI_.stepsWithoutApproach >= 15) {
            reward -= 0.8;
            hunterAI_.stepsWithoutApproach = 0;
            console.log('⚠️ Долгое отсутствие прогресса — дополнительный штраф');
          }
        } else {
          hunterAI_.stepsWithoutApproach = 0;
        }

        
        // Бонус за поимку игрока
        if (newRow === playerPos_.x && newCol === playerPos_.y){
          reward = 15; // Немедленное обучение на этом опыте
        
          this.isGameOver = true;    
          if (this.current_user.potatoes >= 2){
            this.current_user.potatoes -= 2;
            this.potatoCount = this.current_user.potatoes;
            localStorage.setItem('current_user', JSON.stringify(this.current_user));
          }else{
            this.current_user.potatoes = 0;
            this.potatoCount = this.current_user.potatoes;
            localStorage.setItem('current_user', JSON.stringify(this.current_user));
          }
          //for stats
          ////====STATS====////
          this.hunterAI.catches++;
          ////====STATS====////
          alert("Охотник поймал Вас!" + this.hunterAI.catches);
          this.$router.push({
                    name: 'mainmenu'
                })
        }
        console.log('reward: '+reward);
        // Передвижение СПРАЙТА охотника
          
          const targetCell_AI = this.gameMap[newRow][newCol];
          const currentCell_AI = this.gameMap[oldRow][oldCol];

          currentCell_AI.classes = currentCell_AI.classes.filter(c => c !== 'Hunter');
          currentCell_AI.symbol = currentCell_AI.originalSymbol;

          targetCell_AI.classes.push('Hunter');
          targetCell_AI.symbol = this.spriteArray[4];      

          // Обновляем AI поле
          this.ai_game_field[oldRow][oldCol] = 1;
          this.ai_game_field[newRow][newCol] = 4;
          // ВАЖНО: Обновляем hunterAI с новой позицией
          if (hunterAI_) {
              // Обновляем hunterPosition в hunterAI
              hunterAI_.hunterPosition = [{xPos: newCol, yPos: newRow}];
          }
        console.log('ai_game_field после движения:');
        console.table(this.ai_game_field.slice(Math.max(0, newRow - 2), newRow + 3).map(row => row.slice(Math.max(0, newCol - 2), newCol + 3)));
      }
   
      const nextState = hunterAI_.getStateFromGrid();
      // Сохранение опыта
      hunterAI_.remember(state, action, reward, nextState, done);

      // Уменьшение epsilon (так со временем будет меньше случайных действий)
      if (hunterAI_.epsilon > hunterAI_.epsilonMin){
        hunterAI_.epsilon = hunterAI_.epsilon * hunterAI_.epsilonDecay;
      }
    },
    // При старте игры загружаем общую модель
    async saveModelToServer() {
      if (!this.hunterAI || !this.hunterAI.model) {
        console.log('⚠️ Нет модели для сохранения');
        return;
      }
      try{
        const exportData = await this.hunterAI.exportModelToJSON();
        await axios.post('/api/save-model', exportData);
      }
      catch(e){
        console.error(e);
      }
    },
    // ТУМАН ВОЙНЫ //
    isCellInFog(row, col) {
      const playerX = this.playerPos.x;
      const playerY = this.playerPos.y;
      
      // Используем евклидово расстояние для круглой формы
      const distance = Math.sqrt(
        Math.pow(row - playerX, 2) + Math.pow(col - playerY, 2)
      );
      
      return distance > 2; // true если клетка в тумане
    },
    saveData(){
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
    },
    async showStats() {
      const response = await axios.get('/api/stats');
      const { chooseSearch, chooseExploit, games, catches } = response.data;

      const totalActions = chooseSearch + chooseExploit;
      const explorePercent = totalActions ? (chooseSearch / totalActions * 100) : 0;
      const exploitPercent = totalActions ? (chooseExploit / totalActions * 100) : 0;
      const catchRate = games ? (catches / games * 100) : 0;

      alert(`
        Исследований: ${explorePercent.toFixed(1)}%
        Эксплуатаций: ${exploitPercent.toFixed(1)}%
        Поимок за игру: ${catchRate.toFixed(1)}%
        Сыграно уровней: ${games}
    `);
    }

  },
  computed: {
  backgroundStyle() {
    return {
      backgroundImage: `url(/assets/images/${this.currentSpriteSet}.png)`,
      backgroundRepeat: 'no-repeat'
    };
  },

// Новый computed метод для тумана войны
// ТУМАН ВОЙНЫ //
  fogOfWarStyle() {
    return (row, col) => {
      const playerX = this.playerPos.x;
      const playerY = this.playerPos.y;
      
      // Евклидово расстояние для более круглого тумана
      const euclideanDistance = Math.sqrt(
        Math.pow(row - playerX, 2) + Math.pow(col - playerY, 2)
      );
      
      const visibilityRadius = 3;
      
      // Позиция центра тумана (относительно игрока)
      const centerX = ((playerY + 0.5) / this.Y_GameField) * 100;
      const centerY = ((playerX + 0.5) / this.X_GameField) * 100;
      
      // Если клетка близко к игроку - полностью видима
      if (euclideanDistance <= visibilityRadius) {
        return {
          '--fog-center-x': `${centerX}%`,
          '--fog-center-y': `${centerY}%`,
          '--fog-opacity': '0',
          '--darkness-opacity': '0',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        };
      }
      
      // Плавное увеличение непрозрачности с расстоянием
      let fogOpacity = 0;
      let darknessOpacity = 0;
      let intensity = 'low';
      
      if (euclideanDistance > visibilityRadius) {
        // Плавный переход от 0 до 0.98
        fogOpacity = Math.min(0.98, (euclideanDistance - visibilityRadius) / 3);
        
        // Дополнительное затемнение для дальних клеток
        darknessOpacity = Math.min(0.7, (euclideanDistance - visibilityRadius) / 5);
        
        if (euclideanDistance > visibilityRadius + 3) {
          intensity = 'high';
        } else if (euclideanDistance > visibilityRadius + 1.5) {
          intensity = 'medium';
        }
      }
      
      return {
        '--fog-center-x': `${centerX}%`,
        '--fog-center-y': `${centerY}%`,
        '--fog-opacity': fogOpacity,
        '--darkness-opacity': darknessOpacity,
        'data-fog-intensity': intensity,
        color: fogOpacity > 0.5 ? 'transparent' : 'inherit',
        textShadow: fogOpacity > 0.5 ? 'none' : 'inherit',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      };
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
        <p class="username" @click="showStats">{{ current_user?.name }}'s potato adventure</p>
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

          <!--  <td v-for="(cell, colIndex) in row" :key="colIndex" :class="cell.classes" :data-symbol="cell.symbol"
            :data-fog="isCellInFog(rowIndex, colIndex)" :style="fogOfWarStyle(rowIndex, colIndex)"
            @keydown="handleKeyDown($event)">
            {{ cell.symbol }}
          </td>-->


          <td v-for="(cell, colIndex) in row" :key="colIndex" :class="cell.classes" :data-symbol="cell.symbol"
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
    position: relative;
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
/* Стили для тумана войны */
/* ТУМАН ВОЙНЫ */

.elem::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Чтобы туман не мешал кликам/клавишам */
  z-index: 10;
  background: radial-gradient(
    circle at var(--fog-center-x, 50%) var(--fog-center-y, 50%),
    rgba(128, 128, 128, 0) 0%,
    rgba(128, 128, 128, 0.3) 30%,
    rgba(128, 128, 128, 0.7) 60%,
    rgba(128, 128, 128, 0.95) 80%,
    rgba(128, 128, 128, 0.98) 100%
  );
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              background 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 40%; /* Делает туман круглым */
  transform: scale(2.2); /* Увеличиваем радиус действия тумана */
  filter: blur(7px); /* Добавляем размытие для плавности */
}

/* Для ячеек в радиусе видимости - убираем туман */
.elem:not([data-fog="true"])::after {
  display: none;
}
</style>