/**
 * Word list for Word Guess game
 * Supports English and Spanish
 * Words are filtered for familiarity - no obscure/archaic words
 */

export type Language = 'en' | 'es';

// Spanish 5-letter words (common words)
export const SPANISH_WORDS: string[] = [
  // A
  'abajo', 'abeja', 'abril', 'abrir', 'acaso', 'acero', 'acido', 'actua', 'actor', 'acude',
  'adios', 'afear', 'agrio', 'aguja', 'ahora', 'aires', 'ajeno', 'alado', 'alamo', 'album',
  'aldea', 'aleja', 'aleta', 'alfil', 'algas', 'alien', 'aliso', 'altar', 'altas', 'altura',
  'amaba', 'amado', 'amago', 'amano', 'amara', 'amaro', 'amasa', 'ambar', 'ambos', 'ameno',
  'amiga', 'amigo', 'amino', 'amnio', 'amora', 'ancla', 'andar', 'angel', 'anima', 'animo',
  'anota', 'antes', 'antro', 'anual', 'apoyo', 'arabe', 'arbol', 'arena', 'argot', 'arida',
  'armar', 'armas', 'aroma', 'arpon', 'arras', 'arroz', 'asado', 'asear', 'asilo', 'asoma',
  'atlas', 'atras', 'autor', 'avena', 'avion', 'aviso', 'ayuda', 'ayuno', 'azote', 'azuca',
  // B
  'bahia', 'baila', 'baile', 'bajar', 'balde', 'balsa', 'banca', 'banco', 'banda', 'bando',
  'barba', 'barco', 'bares', 'barra', 'barro', 'basar', 'bases', 'basta', 'batea', 'beber',
  'bella', 'bello', 'besar', 'besos', 'bicho', 'bingo', 'blusa', 'bocas', 'bodas', 'bolsa',
  'bomba', 'borde', 'borra', 'botes', 'brazo', 'breve', 'brisa', 'brote', 'brujo', 'bruma',
  'bueno', 'bufon', 'bulto', 'burla', 'busca',
  // C
  'cabal', 'cabra', 'cacao', 'cacho', 'cacos', 'caida', 'cajas', 'calma', 'calor', 'calvo',
  'camas', 'campo', 'canal', 'canas', 'canto', 'capaz', 'carne', 'carta', 'casas', 'casco',
  'casos', 'casta', 'causa', 'cavar', 'cazar', 'ceder', 'cejas', 'celda', 'celos', 'cenar',
  'censo', 'cerca', 'cerdo', 'cerro', 'chica', 'chico', 'chile', 'chino', 'chivo', 'choza',
  'ciega', 'ciego', 'cielo', 'cient', 'cifra', 'cinco', 'cinta', 'circo', 'cisne', 'citas',
  'civil', 'clara', 'claro', 'clase', 'clave', 'clavo', 'clima', 'clubs', 'cobro', 'cocer',
  'coche', 'cocoa', 'codex', 'codos', 'cofre', 'cogen', 'coger', 'cohea', 'cola', 'colas',
  'coles', 'colon', 'color', 'colmo', 'comas', 'combo', 'comen', 'comer', 'comia', 'comun',
  'conde', 'conga', 'conil', 'copia', 'coral', 'coran', 'corma', 'corno', 'coros', 'corta',
  'corte', 'corto', 'cosas', 'costa', 'coste', 'crean', 'crear', 'crece', 'creer', 'crema',
  'crias', 'cruce', 'cruda', 'crudo', 'cruel', 'cruja', 'cuajo', 'cuban', 'cubas', 'cubon',
  'cubos', 'cucos', 'cueca', 'cuero', 'cueva', 'cuida', 'culpa', 'culto', 'curso', 'curva',
  // D
  'dados', 'damas', 'dando', 'danza', 'datar', 'datos', 'debes', 'debil', 'decir', 'dedal',
  'dedos', 'dejar', 'delta', 'demis', 'densa', 'denso', 'desde', 'desea', 'deseo', 'diana',
  'dicha', 'dicho', 'diera', 'dieta', 'digno', 'disco', 'divan', 'divin', 'doble', 'docil',
  'dolor', 'donde', 'dorar', 'dotar', 'draga', 'drama', 'droga', 'ducha', 'dudar', 'dudas',
  'duelo', 'duena', 'dueno', 'dulce', 'duras', 'durar', 'durez', 'duros',
  // E
  'echar', 'efebo', 'egipt', 'elite', 'ellos', 'email', 'enero', 'enojo', 'entra', 'entre',
  'envio', 'epoca', 'equis', 'erase', 'erizo', 'error', 'escri', 'espia', 'estar', 'estas',
  'estos', 'etapa', 'etica', 'etnia', 'euros', 'exito', 'extra',
  // F
  'fabla', 'facil', 'falda', 'falla', 'falsa', 'falso', 'falta', 'famas', 'fango', 'farsa',
  'fatal', 'fauna', 'favor', 'feria', 'feroz', 'fibra', 'ficha', 'fiera', 'fijar', 'filas',
  'finca', 'fines', 'firma', 'firme', 'fisco', 'flash', 'flema', 'floja', 'flojo', 'flora',
  'fluir', 'flujo', 'fobia', 'focal', 'fonda', 'fondo', 'forma', 'forro', 'fosil', 'fotos',
  'fraga', 'freno', 'fresa', 'friar', 'frios', 'frita', 'frito', 'fruta', 'fruto', 'fuego',
  'fuera', 'fuero', 'fuerz', 'fugas', 'fumar', 'furor', 'fusta',
  // G
  'gafas', 'galas', 'gallo', 'gamas', 'ganan', 'ganar', 'ganas', 'ganga', 'garbo', 'garra',
  'garum', 'gasta', 'gasto', 'gatas', 'gatos', 'gayol', 'gazas', 'gemia', 'gente', 'gesto',
  'girar', 'giros', 'globo', 'gnomo', 'goces', 'gofio', 'golfa', 'golfo', 'golpe', 'gorda',
  'gordo', 'gorro', 'gotas', 'gozan', 'gozar', 'graba', 'grado', 'grama', 'grana', 'grasa',
  'grave', 'greda', 'gripa', 'gripe', 'grisa', 'griso', 'grita', 'grupo', 'guapo', 'guiar',
  'guion', 'guisa', 'guiso', 'guita', 'gusco', 'gusto',
  // H
  'haber', 'habia', 'habla', 'hacer', 'hacia', 'hadas', 'halar', 'halda', 'hallo', 'hampa',
  'harpa', 'harta', 'harto', 'hasta', 'hayan', 'hayas', 'hazas', 'heces', 'hecho', 'helar',
  'hemos', 'herir', 'hielo', 'hiena', 'hijos', 'hilar', 'hilos', 'himno', 'hogar', 'hojas',
  'holan', 'holla', 'hombo', 'hondo', 'honor', 'horas', 'horda', 'horno', 'hotel', 'hucha',
  'hueco', 'huele', 'hueso', 'huevo', 'huida', 'huido', 'humor', 'hunos',
  // I - J
  'ideal', 'ideas', 'igual', 'ileso', 'iluso', 'impar', 'india', 'indio', 'infra', 'ingls',
  'inicio', 'islas', 'jabon', 'jamon', 'japon', 'jaque', 'jarra', 'jaula', 'jefes', 'joven',
  'joyas', 'judia', 'judio', 'juega', 'juego', 'jugar', 'jugos', 'junco', 'junta', 'junto',
  'jurar', 'justo', 'juzga',
  // L
  'labio', 'labra', 'lacra', 'lados', 'ladra', 'lagar', 'lagos', 'lamer', 'lanas', 'lanza',
  'lapiz', 'larga', 'largo', 'laser', 'latas', 'latin', 'lavar', 'lavas', 'lazon', 'lecho',
  'legal', 'legua', 'leida', 'leido', 'lejos', 'lemas', 'lento', 'leona', 'letra', 'levan',
  'leyes', 'libre', 'libro', 'liceo', 'lider', 'lidia', 'ligar', 'lilas', 'limar', 'lindo',
  'linea', 'linos', 'lirio', 'lista', 'listo', 'litio', 'litro', 'llama', 'llano', 'llega',
  'llena', 'lleno', 'lleva', 'llora', 'lloro', 'lobby', 'lobos', 'local', 'locos', 'lodos',
  'logra', 'logro', 'lomas', 'lomos', 'lonas', 'lotes', 'lucha', 'lucir', 'luego', 'lugar',
  'lujos', 'lunas', 'lunes', 'luzon',
  // M
  'macho', 'macro', 'madre', 'mafia', 'magia', 'magna', 'magno', 'magos', 'malas', 'malos',
  'malva', 'mamas', 'mando', 'manes', 'manga', 'mango', 'mania', 'manos', 'manta', 'manto',
  'mapas', 'marca', 'marco', 'marea', 'mares', 'marzo', 'masas', 'matas', 'mayor', 'mazas',
  'mecer', 'media', 'medio', 'medir', 'mejor', 'melon', 'menor', 'menos', 'mente', 'menta',
  'menu', 'meras', 'meros', 'mesas', 'meses', 'meson', 'metal', 'meter', 'metro', 'miedo',
  'minas', 'miran', 'mirar', 'misas', 'misil', 'misma', 'mismo', 'mitos', 'mixta', 'mixto',
  'modal', 'modas', 'model', 'modos', 'mojar', 'molde', 'moler', 'moles', 'molla', 'momia',
  'monas', 'monje', 'monos', 'monte', 'monto', 'moral', 'moras', 'morde', 'morir', 'moros',
  'mosca', 'motor', 'mover', 'movil', 'mozon', 'mozos', 'mucha', 'mucho', 'mudar', 'mudas',
  'mudos', 'mueca', 'muela', 'muere', 'mujer', 'mulas', 'multa', 'mundo', 'mural', 'muros',
  'musas', 'museo', 'musgo', 'mutua', 'mutuo',
  // N
  'nacer', 'nacio', 'nacin', 'nadan', 'nadar', 'nadie', 'nafta', 'naipe', 'nalga', 'nariz',
  'nasal', 'natal', 'natas', 'natos', 'naval', 'naves', 'necio', 'negar', 'negro', 'nenas',
  'nenes', 'nieve', 'ninfa', 'ninas', 'ninez', 'ninos', 'niqui', 'nivel', 'noble', 'noche',
  'nodal', 'nodos', 'nogal', 'nomos', 'norma', 'norte', 'notas', 'notar', 'novel', 'novia',
  'novio', 'nubes', 'nucas', 'nudos', 'nuera', 'nueva', 'nueve', 'nuevo', 'nunca', 'nutri',
  // O
  'oasis', 'obras', 'obrar', 'obvia', 'obvio', 'ocaso', 'ocios', 'ocupa', 'ocurr', 'odiar',
  'odios', 'oeste', 'ofici', 'ofre', 'oigan', 'oimos', 'oiste', 'ojear', 'ojera', 'oleos',
  'olers', 'oliva', 'olivo', 'ollas', 'olmos', 'olore', 'olote', 'olras', 'ondas', 'opaco',
  'opera', 'opina', 'opone', 'optar', 'oraen', 'orden', 'oreja', 'organ', 'orgia', 'orina',
  'orlan', 'ornar', 'osado', 'ostra', 'otear', 'otros', 'oveja', 'ovulo', 'oxido', 'oyend',
  'ozono',
  // P
  'pablo', 'padre', 'pagas', 'pagar', 'pagos', 'pajes', 'palas', 'palio', 'palma', 'palmo',
  'palos', 'pampa', 'panda', 'panel', 'panes', 'papel', 'parar', 'pardo', 'pared', 'pares',
  'paris', 'parla', 'parra', 'parte', 'parto', 'pasar', 'pasen', 'paseo', 'pasos', 'pasta',
  'pasto', 'patas', 'patio', 'patos', 'pausa', 'pauta', 'pavos', 'payos', 'pazos', 'pecar',
  'pecho', 'pedal', 'pedir', 'pegar', 'peina', 'pelas', 'pelea', 'pelos', 'penas', 'penal',
  'pende', 'penil', 'peons', 'peona', 'peque', 'peral', 'peras', 'perdi', 'perla', 'perro',
  'pesas', 'pesca', 'pesos', 'petan', 'piano', 'picar', 'picos', 'picar', 'pieza', 'pilas',
  'pinar', 'pinos', 'pinta', 'pinto', 'pipas', 'pirar', 'pisar', 'pisos', 'pista', 'pitar',
  'pizza', 'placa', 'plana', 'plano', 'plata', 'plato', 'playa', 'plaza', 'plazo', 'plebe',
  'plena', 'pleno', 'plomo', 'pluma', 'pobre', 'pocos', 'podas', 'poder', 'poema', 'poeta',
  'polar', 'polen', 'pollo', 'polvo', 'poner', 'pongo', 'ponle', 'popas', 'porta', 'porte',
  'posar', 'poste', 'potro', 'pozan', 'pozos', 'prado', 'pravo', 'presa', 'preso', 'prima',
  'primo', 'prisa', 'probo', 'prole', 'prosa', 'puede', 'pueda', 'pulga', 'pulir', 'pulpo',
  'pulso', 'pumas', 'punta', 'punto', 'puros', 'putan',
  // Q - R
  'queen', 'quema', 'queso', 'quien', 'quiso', 'quita', 'quito', 'rabia', 'rabos', 'racha',
  'radio', 'rajar', 'ramal', 'ramas', 'rampa', 'ranas', 'raras', 'raros', 'rasas', 'rasos',
  'ratos', 'raudo', 'rayar', 'rayos', 'razar', 'razas', 'razon', 'reata', 'recia', 'recio',
  'recta', 'recto', 'redes', 'redil', 'regir', 'regio', 'regla', 'reina', 'reino', 'rejas',
  'relax', 'reloj', 'remar', 'remos', 'renal', 'renta', 'repel', 'repta', 'resal', 'resce',
  'reses', 'resto', 'retan', 'retos', 'reuma', 'rever', 'reves', 'rezar', 'rezos', 'riada',
  'rifas', 'rigor', 'rilas', 'rimas', 'rinde', 'rinon', 'risas', 'ritmo', 'ritos', 'rival',
  'rizos', 'robar', 'robos', 'robot', 'rocas', 'rocio', 'rodar', 'rodea', 'rodeo', 'rogar',
  'rojas', 'rojos', 'rolda', 'rollo', 'roman', 'rompa', 'rompe', 'ronda', 'roneo', 'ropas',
  'roque', 'rosas', 'rosca', 'rotar', 'rotos', 'rozar', 'rubio', 'rubor', 'rueda', 'ruega',
  'ruego', 'rugby', 'rugir', 'ruido', 'ruina', 'rumbo', 'rumor', 'runas', 'rupas', 'rural',
  'rusas', 'rusia', 'rusos', 'rutas', 'rutin',
  // S
  'saber', 'sabia', 'sabio', 'sabor', 'sacar', 'sacos', 'sacro', 'saeta', 'sagaz', 'sagra',
  'sajar', 'salas', 'salaz', 'saldo', 'salga', 'salgo', 'salir', 'salmo', 'salon', 'salsa',
  'salta', 'salto', 'salud', 'salva', 'salvo', 'samba', 'santa', 'santo', 'saque', 'sarna',
  'sarro', 'satan', 'savia', 'sazon', 'secas', 'secar', 'secos', 'secta', 'sedes', 'sedis',
  'segar', 'segun', 'selva', 'semen', 'senas', 'senil', 'senos', 'seque', 'seres', 'seria',
  'serio', 'serra', 'serve', 'sesgo', 'setas', 'sevil', 'sexos', 'sexto', 'sidra', 'siega',
  'sigla', 'siglo', 'signo', 'sigue', 'silla', 'simil', 'simio', 'siren', 'siria', 'sirio',
  'sirva', 'sirve', 'sitio', 'situa', 'sobre', 'socio', 'sodas', 'sodio', 'sofas', 'solar',
  'solas', 'soler', 'solos', 'solta', 'soma', 'somos', 'sonar', 'sonda', 'sopas', 'sopla',
  'soplo', 'sorda', 'sordo', 'sorna', 'sorpd', 'sotar', 'soya', 'suave', 'subas', 'subir',
  'sucio', 'sudar', 'sudor', 'sueco', 'suegr', 'suela', 'sueld', 'suelo', 'suena', 'sueno',
  'suero', 'sueva', 'sufri', 'suiza', 'suizo', 'sumar', 'sumas', 'sumir', 'sumos', 'super',
  'supla', 'suple', 'supli', 'surco', 'surge', 'surja', 'surta', 'susto', 'sutil', 'suyos',
  // T
  'tabas', 'tabla', 'tabon', 'tabus', 'tacha', 'tacos', 'tacon', 'tacto', 'taiga', 'talar',
  'talas', 'talco', 'talla', 'talle', 'talon', 'tanda', 'tango', 'tanos', 'tanta', 'tanto',
  'tapas', 'tapar', 'tapia', 'tapir', 'tapon', 'tardo', 'tarea', 'tarma', 'tarro', 'tarso',
  'tarta', 'tasas', 'tasar', 'taxis', 'taxon', 'tazas', 'tazon', 'tecla', 'techo', 'tejas',
  'tejer', 'tejon', 'telas', 'teman', 'temas', 'tembl', 'temen', 'temer', 'temor', 'tempo',
  'tenas', 'tenaz', 'tenca', 'tenda', 'tener', 'tenga', 'tengo', 'tenia', 'tenis', 'tenor',
  'tensa', 'tenso', 'teoria', 'terco', 'terno', 'terra', 'tersa', 'terso', 'tesis', 'tesla',
  'testa', 'texto', 'tiara', 'tibia', 'tibio', 'tiene', 'tigre', 'tilas', 'tilde', 'timba',
  'timbo', 'timos', 'tinas', 'tinta', 'tinto', 'tipos', 'tique', 'tirad', 'tirar', 'tiras',
  'tiron', 'tiros', 'titan', 'titulo', 'tizas', 'tizon', 'tocar', 'tocho', 'tocin', 'todas',
  'todos', 'togas', 'toldo', 'tomar', 'tomas', 'tonal', 'tonos', 'tonta', 'tonto', 'topan',
  'topar', 'topes', 'toque', 'toral', 'torca', 'tordo', 'torea', 'toreo', 'torio', 'torna',
  'torno', 'toros', 'torre', 'torso', 'torta', 'torvo', 'tosca', 'tosco', 'toser', 'total',
  'totem', 'trama', 'tramo', 'trapo', 'trata', 'trato', 'traza', 'trazo', 'trece', 'trena',
  'trens', 'trepa', 'treta', 'tribu', 'trigo', 'trill', 'tripa', 'troca', 'troja', 'trola',
  'trono', 'tropa', 'trote', 'trova', 'troza', 'truco', 'truja', 'truna', 'tubos', 'tueca',
  'tuera', 'tumba', 'tumor', 'tunas', 'tunel', 'tunos', 'tupir', 'turba', 'turbo', 'turca',
  'turco', 'turno', 'turon', 'tutor', 'tuyas', 'tuyos',
  // U - V
  'ubica', 'ulano', 'ulcer', 'ultra', 'uncir', 'unica', 'unico', 'unida', 'unido', 'union',
  'untar', 'urano', 'ureas', 'urgen', 'urgir', 'urnas', 'usada', 'usado', 'usais', 'usamos',
  'usara', 'usare', 'utero', 'util', 'vacas', 'vacio', 'vagar', 'vagon', 'valer', 'vales',
  'valga', 'valla', 'valle', 'valor', 'valsa', 'valse', 'vanal', 'vanas', 'vanos', 'vapor',
  'vaquea', 'varas', 'varia', 'vario', 'varon', 'vasar', 'vasos', 'vasta', 'vasto', 'vayan',
  'vayas', 'veces', 'vecin', 'vedar', 'vedas', 'vegas', 'veian', 'vejez', 'velas', 'velar',
  'vello', 'vemos', 'venas', 'vence', 'venda', 'vende', 'venga', 'vengo', 'venia', 'venir',
  'venta', 'venus', 'veras', 'verbo', 'verde', 'verga', 'verja', 'verso', 'verte', 'vetas',
  'vetar', 'vetus', 'vezan', 'viaja', 'viaje', 'vibra', 'vicio', 'vidas', 'video', 'vieja',
  'viejo', 'viene', 'viera', 'vigor', 'vilas', 'viles', 'vimos', 'vinas', 'vinos', 'viole',
  'viral', 'viras', 'virus', 'visar', 'visas', 'visor', 'vista', 'visto', 'vital', 'viuda',
  'viudo', 'vivan', 'vivas', 'viven', 'vivir', 'vivos', 'vocal', 'voces', 'volar', 'volea',
  'voleo', 'volta', 'volvi', 'vomit', 'voraz', 'votan', 'votar', 'votos', 'vozal', 'vuelo',
  'vulgo', 'vulva',
  // Y - Z
  'yacen', 'yacer', 'yates', 'yedra', 'yegua', 'yemas', 'yendo', 'yente', 'yerba', 'yermo',
  'yerno', 'yerra', 'yerro', 'yerta', 'yerto', 'yesca', 'yogur', 'yucas', 'yunta', 'zafar',
  'zafio', 'zafra', 'zanja', 'zarpa', 'zarza', 'zenit', 'zonas', 'zorra', 'zorro', 'zueco',
  'zumos', 'zurdo', 'zurra'
];

// Common 5-letter words that players might guess (larger pool)
export const VALID_GUESSES: string[] = [
  // A
  'about', 'above', 'abuse', 'actor', 'acute', 'admit', 'adopt', 'adult', 'after', 'again',
  'agent', 'agree', 'ahead', 'alarm', 'album', 'alert', 'alien', 'align', 'alike', 'alive',
  'allow', 'alloy', 'alone', 'along', 'alpha', 'alter', 'among', 'angel', 'anger', 'angle',
  'angry', 'anime', 'ankle', 'apart', 'apple', 'apply', 'arena', 'argue', 'arise', 'armor',
  'aroma', 'array', 'arrow', 'artist', 'aside', 'asset', 'atlas', 'audio', 'audit', 'avoid',
  'award', 'aware', 'awful',
  // B
  'badge', 'badly', 'bacon', 'basic', 'basin', 'basis', 'batch', 'beach', 'beard', 'beast',
  'began', 'begin', 'being', 'belly', 'below', 'bench', 'berry', 'bible', 'black', 'blade',
  'blame', 'blank', 'blast', 'blaze', 'bleed', 'blend', 'bless', 'blind', 'blink', 'block',
  'blond', 'blood', 'bloom', 'blown', 'blues', 'blunt', 'blush', 'board', 'boast', 'bonus',
  'booth', 'boost', 'booze', 'bored', 'bound', 'boxer', 'brain', 'brake', 'brand', 'brass',
  'brave', 'bread', 'break', 'breed', 'brick', 'bride', 'brief', 'bring', 'broad', 'broke',
  'brook', 'broom', 'brown', 'brush', 'buddy', 'build', 'built', 'bunch', 'bunny', 'burst',
  'buyer',
  // C
  'cabin', 'cable', 'cache', 'camel', 'candy', 'cargo', 'carry', 'carve', 'catch', 'cause',
  'cease', 'chain', 'chair', 'chalk', 'champ', 'chaos', 'charm', 'chart', 'chase', 'cheap',
  'cheat', 'check', 'cheek', 'cheer', 'chess', 'chest', 'chick', 'chief', 'child', 'chill',
  'china', 'chips', 'choir', 'chord', 'chose', 'chunk', 'claim', 'clash', 'class', 'clean',
  'clear', 'clerk', 'click', 'cliff', 'climb', 'cling', 'clock', 'clone', 'close', 'cloth',
  'cloud', 'clown', 'coach', 'coast', 'cocoa', 'colon', 'color', 'comet', 'comic', 'comma',
  'coral', 'couch', 'cough', 'could', 'count', 'court', 'cover', 'crack', 'craft', 'crane',
  'crash', 'crate', 'crawl', 'crazy', 'cream', 'creed', 'creek', 'creep', 'crest', 'crisp',
  'cross', 'crowd', 'crown', 'crude', 'cruel', 'crush', 'crust', 'cubic', 'curry', 'curve',
  'cycle',
  // D
  'daddy', 'daily', 'dairy', 'dance', 'dealt', 'death', 'debut', 'decay', 'decor', 'delta',
  'demon', 'dense', 'depth', 'derby', 'desk', 'devil', 'diary', 'dirty', 'disco', 'ditch',
  'diver', 'dizzy', 'dodge', 'doing', 'donor', 'doubt', 'dough', 'dozen', 'draft', 'drain',
  'drake', 'drama', 'drank', 'dream', 'dress', 'dried', 'drift', 'drill', 'drink', 'drive',
  'droit', 'drown', 'drunk', 'dying',
  // E
  'eager', 'eagle', 'early', 'earth', 'eight', 'elbow', 'elder', 'elect', 'elite', 'email',
  'embed', 'empty', 'enemy', 'enjoy', 'enter', 'entry', 'equal', 'equip', 'erase', 'error',
  'essay', 'ethos', 'event', 'every', 'exact', 'exile', 'exist', 'extra',
  // F
  'fable', 'faced', 'facet', 'faith', 'false', 'fancy', 'fatal', 'fault', 'favor', 'feast',
  'fence', 'ferry', 'fetal', 'fetch', 'fever', 'fiber', 'field', 'fiery', 'fifth', 'fifty',
  'fight', 'final', 'first', 'fixed', 'flame', 'flash', 'flask', 'flesh', 'flick', 'fling',
  'flint', 'float', 'flock', 'flood', 'floor', 'flour', 'fluid', 'flush', 'flute', 'focal',
  'focus', 'foggy', 'force', 'forge', 'forth', 'forum', 'found', 'frame', 'frank', 'fraud',
  'freak', 'fresh', 'fried', 'front', 'frost', 'fruit', 'fully', 'funny', 'fuzzy',
  // G
  'gamma', 'gauge', 'genre', 'ghost', 'giant', 'given', 'glad', 'gland', 'glare', 'glass',
  'gleam', 'globe', 'gloom', 'glory', 'gloss', 'glove', 'going', 'grace', 'grade', 'grain',
  'grand', 'grant', 'grape', 'graph', 'grasp', 'grass', 'grave', 'gravy', 'greed', 'greek',
  'green', 'greet', 'grief', 'grill', 'grind', 'groan', 'groom', 'gross', 'group', 'grove',
  'growl', 'grown', 'guard', 'guess', 'guest', 'guide', 'guild', 'guilt', 'guise', 'guitar',
  // H
  'habit', 'handy', 'happy', 'hardy', 'harsh', 'haste', 'hasty', 'hatch', 'haven', 'hazel',
  'heart', 'heavy', 'hedge', 'heist', 'hello', 'hence', 'herbs', 'heron', 'hinge', 'hippo',
  'hobby', 'holly', 'homer', 'honey', 'honor', 'horse', 'hotel', 'hound', 'house', 'hover',
  'human', 'humid', 'humor', 'hurry',
  // I
  'ideal', 'image', 'imply', 'index', 'indie', 'inner', 'input', 'intel', 'inter', 'intro',
  'irish', 'irony', 'issue', 'ivory',
  // J
  'jeans', 'jelly', 'jewel', 'joint', 'joker', 'jolly', 'judge', 'juice', 'juicy', 'jumbo',
  'jumpy', 'junior',
  // K
  'karma', 'kayak', 'kebab', 'khaki', 'knife', 'knock', 'kneel', 'known',
  // L
  'label', 'labor', 'lance', 'large', 'laser', 'latch', 'later', 'latin', 'laugh', 'layer',
  'learn', 'lease', 'least', 'leave', 'legal', 'lemon', 'level', 'lever', 'light', 'limit',
  'linen', 'liner', 'liver', 'lived', 'lives', 'llama', 'lobby', 'local', 'lodge', 'logic',
  'login', 'lonely', 'loose', 'lorry', 'loser', 'lotus', 'lousy', 'loved', 'lover', 'lower',
  'loyal', 'lucky', 'lunar', 'lunch', 'lying', 'lyric',
  // M
  'macro', 'madam', 'magic', 'magma', 'major', 'maker', 'manor', 'maple', 'march', 'marsh',
  'mason', 'match', 'maxim', 'maybe', 'mayor', 'meant', 'medal', 'media', 'melon', 'mercy',
  'merge', 'merit', 'merry', 'messy', 'metal', 'meter', 'metro', 'micro', 'midst', 'might',
  'minor', 'minus', 'mixer', 'model', 'modem', 'moist', 'money', 'month', 'moose', 'moral',
  'motel', 'motor', 'motto', 'mount', 'mouse', 'mouth', 'movie', 'muddy', 'mural', 'music',
  'musty', 'myrrh', 'mystic',
  // N
  'naive', 'naked', 'nasty', 'naval', 'needs', 'nerve', 'never', 'newly', 'nexus', 'night',
  'ninja', 'ninth', 'noble', 'nodal', 'noise', 'noisy', 'north', 'notch', 'noted', 'novel',
  'nurse', 'nylon',
  // O
  'oasis', 'occur', 'ocean', 'offer', 'often', 'olive', 'omega', 'onion', 'onset', 'opera',
  'optic', 'orbit', 'order', 'organ', 'other', 'ought', 'ounce', 'outer', 'outdo', 'owner',
  'oxide', 'ozone',
  // P
  'paint', 'panda', 'panel', 'panic', 'paper', 'party', 'pasta', 'paste', 'patch', 'patio',
  'pause', 'peace', 'peach', 'pearl', 'pedal', 'penny', 'perch', 'peril', 'perky', 'peter',
  'petty', 'phase', 'phone', 'photo', 'piano', 'piece', 'pilot', 'pinch', 'pitch', 'pixel',
  'pizza', 'place', 'plain', 'plane', 'plant', 'plate', 'plaza', 'plead', 'pleat', 'pluck',
  'plumb', 'plume', 'plump', 'plunk', 'point', 'poise', 'poker', 'polar', 'polio', 'polka',
  'polyp', 'pound', 'power', 'prank', 'press', 'price', 'pride', 'prima', 'prime', 'print',
  'prior', 'prism', 'prize', 'probe', 'proof', 'prose', 'proud', 'prove', 'proxy', 'prune',
  'pulse', 'punch', 'puppy', 'purse', 'pushy',
  // Q
  'quail', 'qualm', 'quark', 'queen', 'query', 'quest', 'queue', 'quick', 'quiet', 'quilt',
  'quirk', 'quite', 'quota', 'quote',
  // R
  'rabbi', 'radar', 'radio', 'rainy', 'raise', 'rally', 'ranch', 'range', 'rapid', 'ratio',
  'razor', 'reach', 'react', 'realm', 'rebel', 'refer', 'reign', 'relax', 'relay', 'relic',
  'repay', 'reply', 'reset', 'resin', 'retry', 'rider', 'ridge', 'rifle', 'right', 'rigid',
  'rigor', 'rinse', 'risky', 'ritual', 'rival', 'river', 'roach', 'roast', 'robot', 'rocky',
  'rodeo', 'rogue', 'roman', 'roost', 'rough', 'round', 'route', 'rover', 'royal', 'rugby',
  'ruler', 'rumor', 'rural', 'rusty',
  // S
  'saint', 'salad', 'salon', 'salsa', 'salty', 'sandy', 'sassy', 'sauce', 'sauna', 'savor',
  'scale', 'scare', 'scarf', 'scary', 'scene', 'scent', 'scope', 'score', 'scout', 'scrap',
  'screw', 'seize', 'sense', 'serum', 'serve', 'setup', 'seven', 'sever', 'shade', 'shady',
  'shaft', 'shake', 'shall', 'shame', 'shape', 'share', 'shark', 'sharp', 'shave', 'sheep',
  'sheer', 'sheet', 'shelf', 'shell', 'shift', 'shine', 'shiny', 'shirt', 'shock', 'shoot',
  'shore', 'short', 'shout', 'shown', 'shrub', 'siege', 'sight', 'sigma', 'silky', 'silly',
  'since', 'siren', 'sixty', 'sized', 'skate', 'skill', 'skull', 'slack', 'slang', 'slash',
  'slate', 'slave', 'sleek', 'sleep', 'slept', 'slice', 'slide', 'slime', 'slope', 'slump',
  'small', 'smart', 'smash', 'smell', 'smile', 'smoke', 'snack', 'snake', 'snare', 'sneak',
  'sniff', 'snore', 'sober', 'solar', 'solid', 'solve', 'sonic', 'sorry', 'sound', 'south',
  'space', 'spare', 'spark', 'spawn', 'speak', 'spear', 'speed', 'spell', 'spend', 'spent',
  'spice', 'spicy', 'spill', 'spine', 'spite', 'split', 'spoke', 'spoon', 'sport', 'spray',
  'spree', 'squad', 'stack', 'staff', 'stage', 'stain', 'stair', 'stake', 'stale', 'stamp',
  'stand', 'stark', 'start', 'state', 'stave', 'stays', 'stead', 'steak', 'steal', 'steam',
  'steel', 'steep', 'steer', 'stern', 'stick', 'stiff', 'still', 'sting', 'stink', 'stock',
  'stoic', 'stomp', 'stone', 'stool', 'store', 'storm', 'story', 'stout', 'stove', 'strap',
  'straw', 'stray', 'strip', 'stuck', 'study', 'stuff', 'stump', 'stung', 'stunk', 'style',
  'sugar', 'suite', 'sunny', 'super', 'surge', 'sushi', 'swamp', 'swarm', 'swear', 'sweat',
  'sweep', 'sweet', 'swell', 'swept', 'swift', 'swing', 'swipe', 'swiss', 'sword', 'sworn',
  'swung', 'synth',
  // T
  'table', 'taboo', 'tacky', 'taken', 'tally', 'tango', 'tangy', 'taper', 'tardy', 'taste',
  'tasty', 'teach', 'tempo', 'tense', 'tenth', 'tepid', 'terms', 'terra', 'terse', 'thank',
  'theft', 'their', 'theme', 'there', 'these', 'thick', 'thief', 'thigh', 'thing', 'think',
  'third', 'those', 'three', 'threw', 'throw', 'thumb', 'tiger', 'tight', 'timer', 'timid',
  'tired', 'titan', 'title', 'toast', 'today', 'token', 'tonic', 'tooth', 'topic', 'torch',
  'total', 'touch', 'tough', 'towel', 'tower', 'toxic', 'trace', 'track', 'trade', 'trail',
  'train', 'trait', 'trash', 'tread', 'treat', 'trend', 'trial', 'tribe', 'trick', 'tried',
  'troop', 'trout', 'truck', 'truly', 'trump', 'trunk', 'trust', 'truth', 'tuber', 'tulip',
  'tumor', 'tunic', 'turbo', 'tutor', 'tweed', 'tweet', 'twice', 'twirl', 'twist', 'tying',
  // U
  'ultra', 'umbra', 'uncle', 'under', 'undue', 'unfit', 'union', 'unite', 'unity', 'until',
  'upper', 'upset', 'urban', 'usage', 'usher', 'using', 'usual', 'utter',
  // V
  'vague', 'valid', 'value', 'valve', 'vapor', 'vault', 'vegan', 'venue', 'verge', 'verse',
  'video', 'vigor', 'vinyl', 'viola', 'viper', 'viral', 'virus', 'visit', 'visor', 'vista',
  'vital', 'vivid', 'vocal', 'vodka', 'vogue', 'voice', 'voter', 'vouch', 'vowel',
  // W
  'wafer', 'wager', 'wagon', 'waist', 'waltz', 'waste', 'watch', 'water', 'waxen', 'weary',
  'weave', 'wedge', 'weigh', 'weird', 'whale', 'wheat', 'wheel', 'where', 'which', 'while',
  'whine', 'white', 'whole', 'whose', 'widen', 'wider', 'widow', 'width', 'wield', 'windy',
  'witch', 'witty', 'woman', 'world', 'worry', 'worse', 'worst', 'worth', 'would', 'wound',
  'woven', 'wrath', 'wreck', 'wrist', 'write', 'wrong', 'wrote',
  // X
  'xerox',
  // Y
  'yacht', 'yearn', 'yeast', 'yield', 'young', 'youth',
  // Z
  'zebra', 'zesty', 'zippy', 'zombi', 'zonal'
];

// Words that can be daily answers (more common, well-known words)
// Subset of VALID_GUESSES - about 800 words that are familiar to most English speakers
export const DAILY_WORDS: string[] = [
  // Most common A words
  'about', 'above', 'actor', 'admit', 'adopt', 'adult', 'after', 'again', 'agent', 'agree',
  'ahead', 'alarm', 'album', 'alert', 'alien', 'align', 'alike', 'alive', 'allow', 'alone',
  'along', 'alter', 'among', 'angel', 'anger', 'angle', 'angry', 'ankle', 'apart', 'apple',
  'apply', 'arena', 'argue', 'arise', 'armor', 'array', 'arrow', 'aside', 'audio', 'avoid',
  'award', 'aware', 'awful',
  // Most common B words
  'badly', 'bacon', 'basic', 'batch', 'beach', 'beard', 'beast', 'began', 'begin', 'being',
  'belly', 'below', 'bench', 'berry', 'black', 'blade', 'blame', 'blank', 'blast', 'blaze',
  'bleed', 'blend', 'bless', 'blind', 'blink', 'block', 'blond', 'blood', 'bloom', 'blown',
  'blues', 'blunt', 'blush', 'board', 'boast', 'bonus', 'booth', 'boost', 'bored', 'bound',
  'boxer', 'brain', 'brake', 'brand', 'brass', 'brave', 'bread', 'break', 'breed', 'brick',
  'bride', 'brief', 'bring', 'broad', 'broke', 'brook', 'broom', 'brown', 'brush', 'buddy',
  'build', 'built', 'bunch', 'bunny', 'burst', 'buyer',
  // Most common C words
  'cabin', 'cable', 'camel', 'candy', 'cargo', 'carry', 'carve', 'catch', 'cause', 'cease',
  'chain', 'chair', 'chalk', 'chaos', 'charm', 'chart', 'chase', 'cheap', 'cheat', 'check',
  'cheek', 'cheer', 'chess', 'chest', 'chick', 'chief', 'child', 'chill', 'china', 'chips',
  'choir', 'chord', 'chose', 'chunk', 'claim', 'clash', 'class', 'clean', 'clear', 'clerk',
  'click', 'cliff', 'climb', 'cling', 'clock', 'clone', 'close', 'cloth', 'cloud', 'clown',
  'coach', 'coast', 'cocoa', 'color', 'comet', 'comic', 'coral', 'couch', 'cough', 'could',
  'count', 'court', 'cover', 'crack', 'craft', 'crane', 'crash', 'crate', 'crawl', 'crazy',
  'cream', 'creek', 'creep', 'crisp', 'cross', 'crowd', 'crown', 'crude', 'cruel', 'crush',
  'curve', 'cycle',
  // Most common D words
  'daddy', 'daily', 'dairy', 'dance', 'dealt', 'death', 'debut', 'decay', 'delta', 'demon',
  'dense', 'depth', 'devil', 'diary', 'dirty', 'ditch', 'diver', 'dizzy', 'dodge', 'doing',
  'donor', 'doubt', 'dough', 'dozen', 'draft', 'drain', 'drama', 'drank', 'dream', 'dress',
  'dried', 'drift', 'drill', 'drink', 'drive', 'drown', 'drunk', 'dying',
  // Most common E words
  'eager', 'eagle', 'early', 'earth', 'eight', 'elbow', 'elder', 'elect', 'elite', 'email',
  'empty', 'enemy', 'enjoy', 'enter', 'entry', 'equal', 'equip', 'erase', 'error', 'essay',
  'event', 'every', 'exact', 'exist', 'extra',
  // Most common F words
  'fable', 'faced', 'faith', 'false', 'fancy', 'fatal', 'fault', 'favor', 'feast', 'fence',
  'ferry', 'fetch', 'fever', 'fiber', 'field', 'fiery', 'fifth', 'fifty', 'fight', 'final',
  'first', 'fixed', 'flame', 'flash', 'flask', 'flesh', 'flick', 'fling', 'float', 'flock',
  'flood', 'floor', 'flour', 'fluid', 'flush', 'flute', 'focal', 'focus', 'foggy', 'force',
  'forge', 'forth', 'forum', 'found', 'frame', 'frank', 'fraud', 'freak', 'fresh', 'fried',
  'front', 'frost', 'fruit', 'fully', 'funny', 'fuzzy',
  // Most common G words
  'gamma', 'gauge', 'genre', 'ghost', 'giant', 'given', 'gland', 'glare', 'glass', 'gleam',
  'globe', 'gloom', 'glory', 'gloss', 'glove', 'going', 'grace', 'grade', 'grain', 'grand',
  'grant', 'grape', 'graph', 'grasp', 'grass', 'grave', 'gravy', 'greed', 'green', 'greet',
  'grief', 'grill', 'grind', 'groan', 'groom', 'gross', 'group', 'grove', 'growl', 'grown',
  'guard', 'guess', 'guest', 'guide', 'guilt',
  // Most common H words
  'habit', 'handy', 'happy', 'harsh', 'haste', 'hatch', 'haven', 'hazel', 'heart', 'heavy',
  'hedge', 'hello', 'hence', 'hinge', 'hippo', 'hobby', 'holly', 'honey', 'honor', 'horse',
  'hotel', 'hound', 'house', 'hover', 'human', 'humid', 'humor', 'hurry',
  // Most common I words
  'ideal', 'image', 'imply', 'index', 'inner', 'input', 'intro', 'irony', 'issue', 'ivory',
  // Most common J words
  'jeans', 'jelly', 'jewel', 'joint', 'joker', 'jolly', 'judge', 'juice', 'juicy', 'jumbo',
  'jumpy',
  // Most common K words
  'karma', 'kayak', 'khaki', 'knife', 'knock', 'kneel', 'known',
  // Most common L words
  'label', 'labor', 'large', 'laser', 'latch', 'later', 'laugh', 'layer', 'learn', 'lease',
  'least', 'leave', 'legal', 'lemon', 'level', 'lever', 'light', 'limit', 'linen', 'liner',
  'liver', 'lived', 'lives', 'llama', 'lobby', 'local', 'lodge', 'logic', 'loose', 'loser',
  'lotus', 'lousy', 'loved', 'lover', 'lower', 'loyal', 'lucky', 'lunar', 'lunch', 'lying',
  'lyric',
  // Most common M words
  'macro', 'magic', 'major', 'maker', 'manor', 'maple', 'march', 'marsh', 'match', 'maybe',
  'mayor', 'meant', 'medal', 'media', 'melon', 'mercy', 'merge', 'merit', 'merry', 'messy',
  'metal', 'meter', 'metro', 'micro', 'might', 'minor', 'minus', 'mixer', 'model', 'modem',
  'moist', 'money', 'month', 'moose', 'moral', 'motel', 'motor', 'motto', 'mount', 'mouse',
  'mouth', 'movie', 'muddy', 'mural', 'music',
  // Most common N words
  'naive', 'naked', 'nasty', 'naval', 'nerve', 'never', 'newly', 'night', 'ninja', 'ninth',
  'noble', 'noise', 'noisy', 'north', 'notch', 'noted', 'novel', 'nurse', 'nylon',
  // Most common O words
  'oasis', 'occur', 'ocean', 'offer', 'often', 'olive', 'omega', 'onion', 'onset', 'opera',
  'optic', 'orbit', 'order', 'organ', 'other', 'ought', 'ounce', 'outer', 'owner', 'ozone',
  // Most common P words
  'paint', 'panda', 'panel', 'panic', 'paper', 'party', 'pasta', 'paste', 'patch', 'patio',
  'pause', 'peace', 'peach', 'pearl', 'pedal', 'penny', 'perky', 'petty', 'phase', 'phone',
  'photo', 'piano', 'piece', 'pilot', 'pinch', 'pitch', 'pixel', 'pizza', 'place', 'plain',
  'plane', 'plant', 'plate', 'plaza', 'plead', 'pluck', 'plumb', 'plume', 'plump', 'point',
  'poise', 'poker', 'polar', 'pound', 'power', 'prank', 'press', 'price', 'pride', 'prime',
  'print', 'prior', 'prism', 'prize', 'probe', 'proof', 'prose', 'proud', 'prove', 'proxy',
  'prune', 'pulse', 'punch', 'puppy', 'purse', 'pushy',
  // Most common Q words
  'queen', 'query', 'quest', 'queue', 'quick', 'quiet', 'quilt', 'quite', 'quota', 'quote',
  // Most common R words
  'radar', 'radio', 'rainy', 'raise', 'rally', 'ranch', 'range', 'rapid', 'ratio', 'razor',
  'reach', 'react', 'realm', 'rebel', 'refer', 'reign', 'relax', 'relay', 'relic', 'repay',
  'reply', 'reset', 'retry', 'rider', 'ridge', 'rifle', 'right', 'rigid', 'rigor', 'rinse',
  'risky', 'rival', 'river', 'roach', 'roast', 'robot', 'rocky', 'rodeo', 'rogue', 'roman',
  'rough', 'round', 'route', 'rover', 'royal', 'rugby', 'ruler', 'rumor', 'rural', 'rusty',
  // Most common S words
  'saint', 'salad', 'salon', 'salsa', 'salty', 'sandy', 'sauce', 'sauna', 'scale', 'scare',
  'scarf', 'scary', 'scene', 'scent', 'scope', 'score', 'scout', 'scrap', 'screw', 'seize',
  'sense', 'serve', 'setup', 'seven', 'shade', 'shady', 'shaft', 'shake', 'shall', 'shame',
  'shape', 'share', 'shark', 'sharp', 'shave', 'sheep', 'sheer', 'sheet', 'shelf', 'shell',
  'shift', 'shine', 'shiny', 'shirt', 'shock', 'shoot', 'shore', 'short', 'shout', 'shown',
  'shrub', 'siege', 'sight', 'sigma', 'silky', 'silly', 'since', 'siren', 'sixty', 'skate',
  'skill', 'skull', 'slack', 'slash', 'slate', 'slave', 'sleek', 'sleep', 'slept', 'slice',
  'slide', 'slime', 'slope', 'small', 'smart', 'smash', 'smell', 'smile', 'smoke', 'snack',
  'snake', 'snare', 'sneak', 'sniff', 'snore', 'sober', 'solar', 'solid', 'solve', 'sonic',
  'sorry', 'sound', 'south', 'space', 'spare', 'spark', 'spawn', 'speak', 'spear', 'speed',
  'spell', 'spend', 'spent', 'spice', 'spicy', 'spill', 'spine', 'spite', 'split', 'spoke',
  'spoon', 'sport', 'spray', 'squad', 'stack', 'staff', 'stage', 'stain', 'stair', 'stake',
  'stale', 'stamp', 'stand', 'stark', 'start', 'state', 'stave', 'steak', 'steal', 'steam',
  'steel', 'steep', 'steer', 'stern', 'stick', 'stiff', 'still', 'sting', 'stink', 'stock',
  'stomp', 'stone', 'stool', 'store', 'storm', 'story', 'stout', 'stove', 'strap', 'straw',
  'stray', 'strip', 'stuck', 'study', 'stuff', 'stump', 'stung', 'stunk', 'style', 'sugar',
  'suite', 'sunny', 'super', 'surge', 'sushi', 'swamp', 'swarm', 'swear', 'sweat', 'sweep',
  'sweet', 'swell', 'swept', 'swift', 'swing', 'swipe', 'swiss', 'sword', 'sworn', 'swung',
  // Most common T words
  'table', 'taboo', 'tacky', 'taken', 'tally', 'tango', 'tangy', 'tardy', 'taste', 'tasty',
  'teach', 'tempo', 'tense', 'tenth', 'tepid', 'thank', 'theft', 'their', 'theme', 'there',
  'these', 'thick', 'thief', 'thigh', 'thing', 'think', 'third', 'those', 'three', 'threw',
  'throw', 'thumb', 'tiger', 'tight', 'timer', 'timid', 'tired', 'titan', 'title', 'toast',
  'today', 'token', 'tonic', 'tooth', 'topic', 'torch', 'total', 'touch', 'tough', 'towel',
  'tower', 'toxic', 'trace', 'track', 'trade', 'trail', 'train', 'trait', 'trash', 'tread',
  'treat', 'trend', 'trial', 'tribe', 'trick', 'tried', 'troop', 'trout', 'truck', 'truly',
  'trump', 'trunk', 'trust', 'truth', 'tulip', 'tumor', 'tunic', 'turbo', 'tutor', 'twice',
  'twirl', 'twist',
  // Most common U words
  'ultra', 'uncle', 'under', 'union', 'unite', 'unity', 'until', 'upper', 'upset', 'urban',
  'usage', 'usher', 'using', 'usual', 'utter',
  // Most common V words
  'vague', 'valid', 'value', 'valve', 'vapor', 'vault', 'vegan', 'venue', 'verge', 'verse',
  'video', 'vigor', 'vinyl', 'viola', 'viper', 'viral', 'virus', 'visit', 'visor', 'vista',
  'vital', 'vivid', 'vocal', 'vodka', 'vogue', 'voice', 'voter', 'vouch', 'vowel',
  // Most common W words
  'wafer', 'wager', 'wagon', 'waist', 'waltz', 'waste', 'watch', 'water', 'weary', 'weave',
  'wedge', 'weigh', 'weird', 'whale', 'wheat', 'wheel', 'where', 'which', 'while', 'whine',
  'white', 'whole', 'whose', 'widen', 'wider', 'widow', 'width', 'wield', 'windy', 'witch',
  'witty', 'woman', 'world', 'worry', 'worse', 'worst', 'worth', 'would', 'wound', 'woven',
  'wrath', 'wreck', 'wrist', 'write', 'wrong', 'wrote',
  // Most common Y words
  'yacht', 'yearn', 'yeast', 'yield', 'young', 'youth',
  // Most common Z words
  'zebra', 'zesty', 'zippy'
];

/**
 * Get the daily word based on date seed and language
 * Uses UTC date to ensure same word worldwide
 */
export function getDailyWord(dateString?: string, language: Language = 'en'): string {
  const date = dateString || new Date().toISOString().slice(0, 10);
  const wordList = language === 'es' ? SPANISH_WORDS : DAILY_WORDS;

  // Simple hash function for the date
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    const char = date.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use absolute value and mod by word list length
  const index = Math.abs(hash) % wordList.length;
  return wordList[index];
}

/**
 * Check if a word is a valid guess based on language
 */
export function isValidWord(word: string, language: Language = 'en'): boolean {
  const lowerWord = word.toLowerCase();
  if (language === 'es') {
    return SPANISH_WORDS.includes(lowerWord);
  }
  return VALID_GUESSES.includes(lowerWord);
}

/**
 * Get the game number (days since a reference date)
 * This gives users a consistent puzzle number like Wordle
 */
export function getGameNumber(): number {
  const startDate = new Date('2025-01-01');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Start from puzzle #1
}
