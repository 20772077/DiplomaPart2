//=== ТУТ БУДЕТ РАСПОЛАГАТЬСЯ ВСЯ ЛОГИКА ДЕЙСТВИЙ ОХОТНИКА ===//
// Импорт TensorFlow.js
import * as tf from '@tensorflow/tfjs';
class HunterRLM {
    gameField;
    playerPosition;
    hunterPosition;
    potatoPosition;
    model;
    chooseSearch;
    chooseExploit;
    catches;
    games;
    constructor(xLenght_, yLenght_) {
    this.chooseSearch = 0;
    this.chooseExploit = 0;
    this.catches = 0;
    this.games = 0;
// Для CartPole: позиция, скорость, угол, угловая скорость. 
// Для меня: (1)игровое поле; (2)позиция игрока; (3)позиция охотника; (4??)позиция картошек; (5)позиция всех препядствий
// Все эти данные можно извлечь из Подготовленного двумерного массива (ПДМ), который подаётся на вход модели    
// UPDATE!
// Состав stateSize:
// 1. Расстояние от охотника до игрока по Х: dx = (х_игрок - х_охотник) / ширина_поля
// 2. Расстояние от охотника до игрока по У: dу = (у_игрок - у_охотник) / высота_поля
// 3. Расстояние до препятствия слева
// 4. Расстояние до препятствия справа
// 5. Расстояние до препятствия сверху
// 6. Расстояние до препятствия снизу
// 7. Расстояние до любой из доступной картошки по Х
// 8. Расстояние до любой из доступной картошки по У
        this.stateSize = 8;

// Количество нейронов равно количеству возможных действий (actionSize). 
// Например, если у игры 4 кнопки (вверх, вниз, влево, вправо), то actionSize = 4.
// (влево = 0) (вправо = 1) (вверх = 2) (вниз = 3)
        this.actionSize = 4;

        this.learningRate = 0.001;
        this.xLenght = xLenght_;
        this.yLenght = yLenght_;
        this.model = null;


        // Переменные для обучения
        this.memory = [];               // Память для опыта
        this.memorySize = 2000;         // Максимальный размер памяти
        this.gamma = 0.95;              // Коэффициент дисконтирования (важность будущих наград)
        this.epsilon = 1.0;             // Начальная вероятность случайного действия
        this.epsilonMin = 0.1;         // Минимальная вероятность
        this.epsilonDecay = 0.98;      // Скорость уменьшения epsilon
        this.batchSize = 128;            // Размер батча для обучения

        //для залипания
        this.lastActions = [];      // история последних действий
        this.repeatPenalty = 0.3;   // штраф за повторение
        this.repeatThreshold = 8;    // после 8 повторений начинаем штрафовать
        this.stepsWithoutApproach = 0;
        this.stepsTowardsPlayer = 0;
}
//___(РАБОТАЕТ) ПОДАЧА НА ВХОД ПДМ___//
    setGameField(gameField_) {       //
        this.gameField = gameField_; //
        //console.log("xLenht= "+this.xLenght)
        //console.log("yLenht= "+this.yLenght)
    }                                //
    getGameField(){                  //
        //alert(this.gameField);       //
        console.log(this.gameField); //
    }                                //
//___________________________________//
    setPlayerPosition() {              //
        let ppResult = this.searchForItem(0, 1);//
        this.playerPosition = ppResult;
    }                                //
    getPlayerPosition(){             //
        console.log(this.playerPosition);  //
    }                                //
//___________________________________//    
    setHunterPosition() {  //
        let hpResult = this.searchForItem(4, 1);//
        this.hunterPosition = hpResult; //
    }                                //
    getHunterPosition(){             //
        //console.log("this.hunterPosition ",this.hunterPosition);  //
        return this.hunterPosition[0];  //
    }                                //
//___________________________________//
    setPotatoPosition() {  //
        let pttpResult = this.searchForItem(3, 3);//
        this.potatoPosition = pttpResult; //
        //console.log(this.potatoPosition);

    }                                //
    getPotatoPosition(){             //
        //console.log(this.potatoPosition);
        return this.potatoPosition;  //
    }                                //
//___________________________________//
    searchForItem(whatToLookFor, howMuch){
        let foundIt = false;                                      //флаг, нашли ли мы искомый элемент
        let amountOfFinded = 0;                                   //счётчик, количество найденных элементов
        let items = [];                                           //массив, найденные элементы
        let breakOutFromInfiniteCycle = 0;                        //Если картошки на поле не окажится - эта переменная предотвратит бесконечный цикл по поиску того, чего на поле нет
        const MAX_ITERATIONS = 100;                               // Защита от бесконечного цикла


        while(foundIt != true){                                   //цикл №1 для прохода по всему ПДМ пока флаг не истина
            if (breakOutFromInfiniteCycle > MAX_ITERATIONS) {break;}
            breakOutFromInfiniteCycle += 1;                       //При поиске картошки если их 1 или 2, цикл перезаписывает на место собраной картошки еще раз уже ранее известную. Когда остаётся одна картошка - все 3 позиции массива заполнены её координатами
            if(breakOutFromInfiniteCycle-howMuch > 1){break;}     //Исправлено: теперь если разница между кол-вом итераций и кол-вом искомых предметов больше 1, цикл прекращается
            for(let x = 0; x <= this.xLenght-1; x++){             //Цикл №2-1 для прохода по всему ПДМ по каждой координате (строка)
                for(let y = 0; y <= this.yLenght-1; y++){         //Цикл №2-2  для прохода по всему ПДМ по каждой координате (элемент строки - столбец)
                    if(this.gameField[x][y] == whatToLookFor){    //Проверка №1: элемент игрового поля совпадает с тем, что мы ищем?
                        //alert(this.gameField[x][y]);            //Проверка №1 ИСТИНА: Технический вывод всего игрового поля если 
                        if(amountOfFinded < howMuch){             //Проверка №2: найденных элементов меньше, чем надо?
                            amountOfFinded += 1;                  //Проверка №2 - ИСТИНА: добавляем в счётчик 1 (найденный элемент)
                            let position = {xPos : y, yPos : x};
                            //console.log(position); 
                            items.push(position);                 //Проверка №2 - ИСТИНА: помещаем координаты найденного элемента в массим
                        }else{foundIt = true; break;}             //Проверка №2 - ЛОЖЬ: Иначе - нашли всё, что нужно. Флаг ставим в ИСТИНА и выодим из цикла (?)
                    }
                    else{continue;}                               //Проверка №1 - ЛОЖЬ: продолжаем искать
                }                                                 //Цикл №2-1, 2-2 с х и у выходит за рамки 27-ми. ИСПРАВЛЕНО: Теперь берётся в цикле значение 27-1=26
            }                                                     //После находления всех картошек происходит бесконечный цикл. Надо его ограничить: если он срабатывает более N раз (3) - выходить из цикла
        }                                                         
        //console.log(items);
        // сортирую по картошке - в основном для неё нужна сотртировка - по убыванию через компаратор сравнения
        // разница меньше нуля у сортируемых элементов - бОльший идёт влево
        return items.sort((a, b) => b.xPos - a.xPos);
    }
    async buildModel() {

        try{

            // ВАЖНО: Ждем готовности TensorFlow
            await tf.ready();
            
            // Небольшая задержка для стабильности
            await new Promise(resolve => setTimeout(resolve, 100));


            const model = tf.tidy(() => {
                const m = tf.sequential();
                m.add(tf.layers.dense({
                    units: 24, 
                    inputShape: [this.stateSize],
                    activation: 'relu'
                }));

                m.add(tf.layers.dense({
                    units: 24, 
                    activation: 'relu'
                }));

                m.add(tf.layers.dense({
                    units: this.actionSize,
                    activation: 'linear'
                }));

                m.compile({
                    loss: 'meanSquaredError', 
                    optimizer: tf.train.adam(this.learningRate)
                });
                
                return m;
            });
            this.model = model;
            console.log('Модель создана');
            return true;
            
        }
        catch(e){console.error(e); return false;}        

    }
    //возвращает расстояние
    findNearestObstacle(coordinates, direction){
        let tmpCoodinate_X = coordinates.xPos;
        let tmpCoodinate_Y = coordinates.yPos;
        let iterations = 0;
        const MAX_ITERATIONS = 100; // Защита
        //console.log(coordinates.yPos);
         switch(direction) {
        case 'left': // ищем влево (уменьшаем X - столбец)
            while (true) {
                iterations++;
                if (iterations > MAX_ITERATIONS) return null;
                
                // Проверка на левую границу
                if (tmpCoodinate_X <= 0) return null;
                
                tmpCoodinate_X = tmpCoodinate_X - 1;
                
                // Проверяем, что индексы в пределах массива
                if (tmpCoodinate_Y >= 0 && tmpCoodinate_Y < this.xLenght && 
                    tmpCoodinate_X >= 0 && tmpCoodinate_X < this.yLenght) {
                    
                    if (this.gameField[tmpCoodinate_Y][tmpCoodinate_X] == 2) {
                        return {x: tmpCoodinate_Y, y: tmpCoodinate_X};
                    }
                } else {
                    return null; // Выход за границы
                }
            }
            break;
            
        case 'right': // ищем вправо (увеличиваем X - столбец)
            while (true) {
                iterations++;
                if (iterations > MAX_ITERATIONS) return null;
                
                // Проверка на правую границу
                if (tmpCoodinate_X >= this.yLenght - 1) return null;
                
                tmpCoodinate_X = tmpCoodinate_X + 1;
                
                if (tmpCoodinate_Y >= 0 && tmpCoodinate_Y < this.xLenght && 
                    tmpCoodinate_X >= 0 && tmpCoodinate_X < this.yLenght) {
                    
                    if (this.gameField[tmpCoodinate_Y][tmpCoodinate_X] == 2) {
                        return {x: tmpCoodinate_Y, y: tmpCoodinate_X};
                    }
                } else {
                    return null;
                }
            }
            break;
            
        case 'up': // ищем вверх (уменьшаем Y - строку)
            while (true) {
                iterations++;
                if (iterations > MAX_ITERATIONS) return null;
                
                // Проверка на верхнюю границу
                if (tmpCoodinate_Y <= 0) return null;
                
                tmpCoodinate_Y = tmpCoodinate_Y - 1;
                
                if (tmpCoodinate_Y >= 0 && tmpCoodinate_Y < this.xLenght && 
                    tmpCoodinate_X >= 0 && tmpCoodinate_X < this.yLenght) {
                    
                    if (this.gameField[tmpCoodinate_Y][tmpCoodinate_X] == 2) {
                        return {x: tmpCoodinate_Y, y: tmpCoodinate_X};
                    }
                } else {
                    return null;
                }
            }
            break;
            
        case 'down': // ищем вниз (увеличиваем Y - строку)
            while (true) {
                iterations++;
                if (iterations > MAX_ITERATIONS) return null;
                
                // Проверка на нижнюю границу
                if (tmpCoodinate_Y >= this.xLenght - 1) return null;
                
                tmpCoodinate_Y = tmpCoodinate_Y + 1;
                
                if (tmpCoodinate_Y >= 0 && tmpCoodinate_Y < this.xLenght && 
                    tmpCoodinate_X >= 0 && tmpCoodinate_X < this.yLenght) {
                    
                    if (this.gameField[tmpCoodinate_Y][tmpCoodinate_X] == 2) {
                        return {x: tmpCoodinate_Y, y: tmpCoodinate_X};
                    }
                } else {
                    return null;
                }
            }
            break;
    }
    return null;
    }
    getStateFromGrid(){
            // Защита от отсутствия данных
    if (!this.playerPosition || this.playerPosition.length === 0 || !this.hunterPosition || this.hunterPosition.length === 0) {
        console.warn('getStateFromGrid: позиции игрока или охотника не инициализированы');
        // Возвращаем нулевое состояние (массив из 8 нулей)
        return [0, 0, 0, 0, 0, 0, 0, 0];
    }
        // Пункты 1-2
        const dx = Math.abs((this.playerPosition[0].xPos - this.hunterPosition[0].xPos)/this.yLenght);
        const dy = Math.abs((this.playerPosition[0].yPos - this.hunterPosition[0].yPos)/this.xLenght);

        // Пункты 3-6 
        // Пока только координаты; может быть, потребуется выводить именно расстояние до препятствия
        const nearestObstacleLeft = this.findNearestObstacle(this.hunterPosition[0],'left');
        const nearestObstacleRight = this.findNearestObstacle(this.hunterPosition[0],'right');
        const nearestObstacleUp = this.findNearestObstacle(this.hunterPosition[0],'up');
        const nearestObstacleDown = this.findNearestObstacle(this.hunterPosition[0],'down');
        
        const normalizedNearestObstacleLeftY = nearestObstacleLeft ? 
            Math.abs(nearestObstacleLeft.y- this.hunterPosition[0].xPos)/this.yLenght : 1;
        //console.log("normalizedNearestObstacleLeftY ",normalizedNearestObstacleLeftY);

        const normalizedNearestObstacleRightY = nearestObstacleRight ? 
            Math.abs(nearestObstacleRight.y - this.hunterPosition[0].xPos)/this.yLenght : 1;
        //console.log("normalizedNearestObstacleRightY ",normalizedNearestObstacleRightY);

        const normalizedNearestObstacleUpX = nearestObstacleUp ? 
            Math.abs(nearestObstacleUp.x - this.hunterPosition[0].yPos)/this.xLenght : 1;
        //console.log("normalizedNearestObstacleUpX ",normalizedNearestObstacleUpX);

        const normalizedNearestObstacleDownX = nearestObstacleDown ? 
            Math.abs(nearestObstacleDown.x - this.hunterPosition[0].yPos)/this.xLenght : 1;
        //console.log("normalizedNearestObstacleDownX ",normalizedNearestObstacleDownX);


        // Пункты 7-8 - картошка (с защитой!)
        let normalizedNearestPotatoX = 1; // По умолчанию 1 (максимальное расстояние)
        let normalizedNearestPotatoY = 1;

        if (this.potatoPosition && this.potatoPosition.length > 0) {
        // Если есть картошки, берем первую (после сортировки)
            const potato = this.potatoPosition[0];
            normalizedNearestPotatoX = Math.abs((potato.xPos - this.hunterPosition[0].xPos)/this.xLenght);
            normalizedNearestPotatoY = Math.abs((potato.yPos - this.hunterPosition[0].yPos)/this.yLenght);
        }

        //console.log("normalizedPotato: X - Y ",Number(normalizedNearestPotatoX),Number(normalizedNearestPotatoY));

        //console.log("dx = ",dx);
        //console.log("dy = ",dy);
        console.log('📏 dx (по горизонтали):', dx, 'dy (по вертикали):', dy);
        // Формирую состояние
        return [
            Number(dx),                             // Расстояние от охотника до игрока по Х
            Number(dy),                             // Расстояние от охотника до игрока по У
            
            Number(normalizedNearestObstacleLeftY), // Расстояние от охотника до преп. по У (ГОРИЗОНТАЛЬ) слева 

            Number(normalizedNearestObstacleRightY), // Расстояние от охотника до преп. по У (ГОРИЗОНТАЛЬ) справа 

            Number(normalizedNearestObstacleUpX),    // Расстояние от охотника до преп. по Х (ВЕРТИКАЛЬ) сверху

            Number(normalizedNearestObstacleDownX),  // Расстояние от охотника до преп. по Х (ВЕРТИКАЛЬ) снизу

            Number(normalizedNearestPotatoX),        // 7. Расстояние до ближайшей доступной картошки по Х

            Number(normalizedNearestPotatoY)         // 8. Расстояние до ближайшей доступной картошки по У
        ]

    }
// Обучение модели
    remember(state_, action_, reward_, nextState_, done_){
        // сохранение опыта ИИ
        this.memory.push(
            {
                state: [...state_],      // Копирование, чтобы не изменилось. Память, как-никак
                action: action_,
                reward: reward_,
                nextState: [...nextState_],
                done: done_
            }
        );
        //Метод Array.shift() в JavaScript удаляет первый элемент из массива и возвращает его значение. При этом длина массива уменьшается на 1. 
        //Метод полезен в сценариях, где элементы нужно обрабатывать в порядке, в котором они были добавлены, например, в структурах, похожих на очередь. 
        if(this.memory.length > this.memorySize){
            this.memory.shift();
        }
    }
// обучение модели на опыте
    async replay(batchSize = 10){
        // если количество данных в памяти меньше размера батча - нам тут делать нечего - выходим
        if (this.memory.length < batchSize) {return;}

        // случайно выбираем из памяти предыдущие ходы
        const batch = [];
        for(let i = 0; i < batchSize; i++){
            const randomIndexOfMemory = Math.floor(Math.random()*this.memory.length);
            batch.push(this.memory[randomIndexOfMemory]);
        }

    //Цикл for...of в JavaScript — это конструкция для перебора значений итерируемых объектов — объектов, которые предоставляют итератор через метод Symbol.iterator. 
    // К итерируемым объектам относятся: 
    // - массивы (['a', 'b', 'c']);
    // - строки ('hello');
    // - коллекции DOM (NodeList, HTMLCollection и др);
    // - объекты Set и Map;
    // - типизированные массивы (Uint8Array и др.).
    // Цикл был введён в JavaScript в 2015 году с выходом спецификации ECMAScript 6 (ES6). 

        for (const element of batch){
            const { state, action, reward, nextState, done } = element;

            // Создание тензора
            const stateTensor = tf.tensor2d([state], [1, this.stateSize]);
            const nextStateTensor = tf.tensor2d([nextState], [1, this.stateSize]);

            // Получение Q-значений для текущего состояния
            const currentQ = this.model.predict(stateTensor);
            const currentQData = await currentQ.data();

            // Получение Q-значений для следующего состояния
            const nextQ = this.model.predict(nextStateTensor);
            const nextQData = await nextQ.data();


    // Формула (уравнение) Беллмана 
    // Суть формулы: ценность состояния равна полученному сейчас вознаграждению плюс ожидаемому значению следующего состояния. 
    // Это помогает агенту принимать более обоснованные решения, учитывая как немедленное, так и будущее вознаграждение. 
    // Уравнение Беллмана позволяет агентам думать наперёд, балансировать сиюминутное и будущее вознаграждение и разумно выбирать действия.
    // https://www.geeksforgeeks.org/machine-learning/bellman-equation/ - формула
    // https://habr.com/ru/articles/919556/ - теория

            const targetQ = [...currentQData];

            if (done){
                // Если эпизод завершён, то цель равняется награде
                targetQ[action] = reward;
            }
            else{
                // Иначе
                // ЦЕЛЬ = НАГРАДА + gamma * максимальное Q следующего состояния
                targetQ[action] = reward + this.gamma * Math.max(...nextQData);
            }

            // Обучение модели
            await this.model.fit(
                stateTensor, 
                tf.tensor2d([targetQ],[1, this.actionSize]),
                {
                    epochs: 1,
                    verbose: 0
                }
        )

        // очистка памяти
        stateTensor.dispose();
        nextStateTensor.dispose();
        currentQ.dispose();
        nextQ.dispose();

        }

        console.log("обучение завершено!");
        // В hunter.js, в методе replay
        console.log(`🧠 Обучение на ${batch.length} примерах, epsilon: ${this.epsilon.toFixed(3)}`);
    }
// выбор действия с жадностью по epsilon

// Epsilon-greedy — стратегия в обучении с подкреплением (reinforcement learning, RL), которая балансирует между исследованием новых действий и использованием полученных знаний. 
// Цель — максимизировать ожидаемую суммарную награду. 
// -- Принцип работы --
// Значение ε обычно находится в диапазоне от 0 до 1. 
// Чем выше значение, тем больше агент исследует, а чем ниже — тем больше использует полученные знания. 

    async chooseAction(state){
        //this.model.summary();
        if (Math.random() < this.epsilon){
            // Случайное действие - исследование
            console.warn('Исследование - случайное действие');
            this.chooseSearch++;
            return Math.floor(Math.random() * this.actionSize);
        }
        // Действие от нейросети - использовани опыта
        return this.chooseBestAction(state);
    }

    async chooseBestAction(state){
        // Если модели нет - случайное действие
        if (!this.model){
            return Math.floor(Math.random() * this.actionSize);
        }

        try {

            await tf.ready();
            const numericState = state.map(Number);

            return tf.tidy(
                () => {
                    const stateTensor = tf.tensor2d([numericState], [1, this.stateSize]);
                    const predictions = this.model.predict(stateTensor);
                    const qValues = predictions.dataSync();


                    //==================\\
                    //избегаем залипания\\
                    //==================//
                    
                    // Применяем штраф за повторяющиеся действия
                    if (this.lastActions.length >= this.repeatThreshold) {
                        // Считаем, сколько раз повторялось каждое действие
                        const actionCounts = [0, 0, 0, 0];
                        for (const a of this.lastActions) {
                            actionCounts[a]++;
                        }
                        
                        // Штрафуем действия, которые повторялись слишком часто
                        for (let i = 0; i < qValues.length; i++) {
                            if (actionCounts[i] >= this.repeatThreshold) {
                                qValues[i] -= this.repeatPenalty * actionCounts[i];
                                console.log(`⚠️ Штраф за повторение действия ${i} (${actionCounts[i]} раз)`);
                            }
                        }
                    }

                    // Обновляем историю действий

                    //==================\\
                    //==================\\
                    //==================//

                    let bestAction = 0;
                    let bestValue = qValues[0];
                    for (let i = 1; i < qValues.length; i++){
                        if (qValues[i] > bestValue){
                            bestValue = qValues[i];
                            bestAction = i;
                        }
                    }
                    this.lastActions.push(bestAction);
                    if (this.lastActions.length > 15) this.lastActions.shift(); // храним последние 10
                    console.error('выбрано действие', bestAction);
                    console.log('📊 Q-значения:', qValues);
                    console.log('🎯 Выбрано действие:', bestAction);
                    this.chooseExploit++;
                    return bestAction;
                
                }
            );


        }
        
        catch (e) { console.error(e); }
    }
    async exportModelToJSON() {
        if (!this.model) {
            console.error("Модели не существует");
            return null;
        }

        try {
            const modelJSON = this.model.toJSON();
            const weights = await this.model.getWeights();
            
            const weightsData = await Promise.all(
                weights.map(async (tensor) => {
                    const data = await tensor.array();
                    return {
                        shape: tensor.shape,
                        data: data
                    };
                })
            );

            const exportData = {
                model: modelJSON,
                weights: weightsData,
                stateSize: this.stateSize,
                actionSize: this.actionSize,
                timestamp: new Date().toISOString()
            };
            
            return exportData;
        } catch(e) {
            console.error('Ошибка экспорта модели:', e);
            return null;
        }
    }

    async importModelFromJSON(jsonData) {
    try {
        const { model: modelJSON, weights: weightsData } = jsonData;

                // Если model - строка, парсим
        const modelConfig = typeof jsonData.model === 'string' 
            ? JSON.parse(jsonData.model) 
            : jsonData.model;
            
        console.log('modelConfig тип:', typeof modelConfig);
        
        const model = await tf.models.modelFromJSON(modelConfig);
        
        const weightTensors = weightsData.map(w => tf.tensor(w.data, w.shape));
        
        model.setWeights(weightTensors);

        model.compile({
            optimizer: tf.train.adam(this.learningRate),
            loss: 'meanSquaredError'
        });

        this.model = model;
        this.modelReady = true;
        
        // Очищаем временные тензоры
        weightTensors.forEach(t => t.dispose());
        
        console.log('✅ Модель импортирована из JSON');
        return true;
    } catch(e) {
        console.error('Ошибка импорта модели:', e);
        return false;
    }
    }
// end of class    
}
export default HunterRLM;