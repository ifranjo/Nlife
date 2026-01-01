/**
 * Word list for Word Guess game
 * 2000+ common 5-letter English words suitable for a Wordle-style game
 * Words are filtered for familiarity - no obscure/archaic words
 */

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
 * Get the daily word based on date seed
 * Uses UTC date to ensure same word worldwide
 */
export function getDailyWord(dateString?: string): string {
  const date = dateString || new Date().toISOString().slice(0, 10);

  // Simple hash function for the date
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    const char = date.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use absolute value and mod by word list length
  const index = Math.abs(hash) % DAILY_WORDS.length;
  return DAILY_WORDS[index];
}

/**
 * Check if a word is a valid guess
 */
export function isValidWord(word: string): boolean {
  return VALID_GUESSES.includes(word.toLowerCase());
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
