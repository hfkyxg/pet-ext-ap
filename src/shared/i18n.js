/* ===================================================
   CLAW'D — i18n (UI chrome + speech pools)
   Carregar ANTES de catalog.js / content.js / popup.js.
   Fallback: locale selecionado → en → pt-BR
   =================================================== */

var CLAWD_I18N_UI = {
  'pt-BR': {
    tab_appearance: 'Aparência', tab_profession: 'Profissão', tab_behavior: 'Comportamento',
    tab_actions: 'Ações', tab_pets: 'Sub-Pets', tab_shop: 'Lojinha',
    tab_achievements: 'Conquistas', tab_config: 'Configurações',
    lang_label: 'Idioma',
    toast_pos: 'Posição dos toasts',
    speech_pos: 'Posição do balão de fala',
    emotion_pos: 'Lado do badge de emoção',
    pos_center: 'Centro', pos_l: 'Lateral esquerda', pos_r: 'Lateral direita',
    pos_bl: 'Inferior esquerdo', pos_br: 'Inferior direito',
    pos_tl: 'Superior esquerdo', pos_tr: 'Superior direito',
    speech_auto: 'Automático (borda)', speech_left: 'Esquerda', speech_right: 'Direita',
    speech_above: 'Acima', speech_below: 'Abaixo',
    emotion_left: 'Esquerda', emotion_right: 'Direita',
    start_corner: 'Posição inicial preferida',
    trello_section: 'Trello (feedback)',
    trello_key: 'API Key', trello_token: 'Token', trello_board_id: 'Board ID',
    trello_board_url: 'URL do board público',
    trello_idea: 'Enviar sugestão ao Trello', trello_bug: 'Reportar bug',
    trello_open: 'Abrir board público',
    trello_hint: 'Chave em https://trello.com/app-key — nunca compartilhe o token.',
    trello_ok: 'Card criado no Trello!', trello_fail: 'Falha ao criar card. Verifique key/token/board.',
    trello_need: 'Configure API Key, Token e Board ID nas configurações.',
    export_data: 'Exportar dados (JSON)', import_data: 'Importar dados',
    reset_all: 'Resetar progresso',
    footer: "Claw'd — Companheiro de Navegação",
    nick_call_me: 'Pode me chamar de {nick}! 🐾'
  },
  en: {
    tab_appearance: 'Appearance', tab_profession: 'Profession', tab_behavior: 'Behavior',
    tab_actions: 'Actions', tab_pets: 'Sub-Pets', tab_shop: 'Shop',
    tab_achievements: 'Achievements', tab_config: 'Settings',
    lang_label: 'Language',
    toast_pos: 'Toast position',
    speech_pos: 'Speech bubble position',
    emotion_pos: 'Emotion badge side',
    pos_center: 'Center', pos_l: 'Left side', pos_r: 'Right side',
    pos_bl: 'Bottom left', pos_br: 'Bottom right',
    pos_tl: 'Top left', pos_tr: 'Top right',
    speech_auto: 'Auto (edge)', speech_left: 'Left', speech_right: 'Right',
    speech_above: 'Above', speech_below: 'Below',
    emotion_left: 'Left', emotion_right: 'Right',
    start_corner: 'Preferred start corner',
    trello_section: 'Trello (feedback)',
    trello_key: 'API Key', trello_token: 'Token', trello_board_id: 'Board ID',
    trello_board_url: 'Public board URL',
    trello_idea: 'Send idea to Trello', trello_bug: 'Report bug',
    trello_open: 'Open public board',
    trello_hint: 'Get a key at https://trello.com/app-key — never share your token.',
    trello_ok: 'Card created on Trello!', trello_fail: 'Failed to create card. Check key/token/board.',
    trello_need: 'Configure API Key, Token and Board ID in settings.',
    export_data: 'Export data (JSON)', import_data: 'Import data',
    reset_all: 'Reset progress',
    footer: "Claw'd — Navigation Companion",
    nick_call_me: 'You can call me {nick}! 🐾'
  },
  es: {
    tab_appearance: 'Apariencia', tab_profession: 'Profesión', tab_behavior: 'Comportamiento',
    tab_actions: 'Acciones', tab_pets: 'Sub-Mascotas', tab_shop: 'Tienda',
    tab_achievements: 'Logros', tab_config: 'Ajustes',
    lang_label: 'Idioma', toast_pos: 'Posición de toasts', speech_pos: 'Posición del globo',
    emotion_pos: 'Lado del badge de emoción',
    pos_center: 'Centro', pos_l: 'Lateral izquierda', pos_r: 'Lateral derecha',
    pos_bl: 'Inferior izquierdo', pos_br: 'Inferior derecho',
    pos_tl: 'Superior izquierdo', pos_tr: 'Superior derecho',
    speech_auto: 'Automático', speech_left: 'Izquierda', speech_right: 'Derecha',
    speech_above: 'Arriba', speech_below: 'Abajo', emotion_left: 'Izquierda', emotion_right: 'Derecha',
    start_corner: 'Esquina inicial preferida', trello_section: 'Trello (feedback)',
    trello_key: 'API Key', trello_token: 'Token', trello_board_id: 'Board ID',
    trello_board_url: 'URL del tablero público', trello_idea: 'Enviar idea a Trello',
    trello_bug: 'Reportar bug', trello_open: 'Abrir tablero público',
    trello_hint: 'Clave en https://trello.com/app-key — no compartas el token.',
    trello_ok: '¡Tarjeta creada!', trello_fail: 'Error al crear. Revisa key/token/board.',
    trello_need: 'Configura API Key, Token y Board ID.',
    export_data: 'Exportar datos (JSON)', import_data: 'Importar datos',
    reset_all: 'Restablecer progreso', footer: "Claw'd — Compañero de navegación",
    nick_call_me: '¡Puedes llamarme {nick}! 🐾'
  },
  'zh-CN': {
    tab_appearance: '外观', tab_profession: '职业', tab_behavior: '行为',
    tab_actions: '动作', tab_pets: '子宠物', tab_shop: '商店',
    tab_achievements: '成就', tab_config: '设置',
    lang_label: '语言', toast_pos: '提示位置', speech_pos: '气泡位置',
    emotion_pos: '情绪徽章位置',
    pos_center: '居中', pos_l: '左侧', pos_r: '右侧',
    pos_bl: '左下', pos_br: '右下', pos_tl: '左上', pos_tr: '右上',
    speech_auto: '自动', speech_left: '左侧', speech_right: '右侧',
    speech_above: '上方', speech_below: '下方', emotion_left: '左侧', emotion_right: '右侧',
    start_corner: '首选起始角落', trello_section: 'Trello（反馈）',
    trello_key: 'API Key', trello_token: 'Token', trello_board_id: 'Board ID',
    trello_board_url: '公开看板链接', trello_idea: '发送建议到 Trello',
    trello_bug: '报告问题', trello_open: '打开公开看板',
    trello_hint: '在 https://trello.com/app-key 获取密钥 — 请勿分享 token。',
    trello_ok: '已创建卡片！', trello_fail: '创建失败，请检查密钥。',
    trello_need: '请先配置 API Key、Token 和 Board ID。',
    export_data: '导出数据 (JSON)', import_data: '导入数据',
    reset_all: '重置进度', footer: "Claw'd — 浏览伙伴",
    nick_call_me: '可以叫我 {nick}！🐾'
  },
  ja: {
    tab_appearance: '見た目', tab_profession: '職業', tab_behavior: '行動',
    tab_actions: 'アクション', tab_pets: 'サブペット', tab_shop: 'ショップ',
    tab_achievements: '実績', tab_config: '設定',
    lang_label: '言語', toast_pos: 'トースト位置', speech_pos: '吹き出し位置',
    emotion_pos: '感情バッジの側',
    pos_center: '中央', pos_l: '左側', pos_r: '右側',
    pos_bl: '左下', pos_br: '右下', pos_tl: '左上', pos_tr: '右上',
    speech_auto: '自動', speech_left: '左', speech_right: '右',
    speech_above: '上', speech_below: '下', emotion_left: '左', emotion_right: '右',
    start_corner: '開始コーナー', trello_section: 'Trello（フィードバック）',
    trello_key: 'API Key', trello_token: 'Token', trello_board_id: 'Board ID',
    trello_board_url: '公開ボードURL', trello_idea: '提案をTrelloへ',
    trello_bug: 'バグ報告', trello_open: '公開ボードを開く',
    trello_hint: 'https://trello.com/app-key でキー取得 — トークンは共有しないで。',
    trello_ok: 'カードを作成しました！', trello_fail: '作成に失敗。設定を確認。',
    trello_need: 'API Key・Token・Board IDを設定してください。',
    export_data: 'データ書き出し (JSON)', import_data: 'データ読込',
    reset_all: '進捗リセット', footer: "Claw'd — ナビ相棒",
    nick_call_me: '{nick} と呼んでね！🐾'
  },
  fr: {
    tab_appearance: 'Apparence', tab_profession: 'Profession', tab_behavior: 'Comportement',
    tab_actions: 'Actions', tab_pets: 'Sous-animaux', tab_shop: 'Boutique',
    tab_achievements: 'Succès', tab_config: 'Réglages',
    lang_label: 'Langue', toast_pos: 'Position des toasts', speech_pos: 'Position de la bulle',
    emotion_pos: 'Côté du badge émotion',
    pos_center: 'Centre', pos_l: 'Côté gauche', pos_r: 'Côté droit',
    pos_bl: 'Bas gauche', pos_br: 'Bas droit',
    pos_tl: 'Haut gauche', pos_tr: 'Haut droit',
    speech_auto: 'Auto', speech_left: 'Gauche', speech_right: 'Droite',
    speech_above: 'Au-dessus', speech_below: 'En dessous',
    emotion_left: 'Gauche', emotion_right: 'Droite',
    start_corner: 'Coin de départ préféré', trello_section: 'Trello (feedback)',
    trello_key: 'API Key', trello_token: 'Token', trello_board_id: 'Board ID',
    trello_board_url: 'URL du tableau public', trello_idea: 'Envoyer une idée',
    trello_bug: 'Signaler un bug', trello_open: 'Ouvrir le tableau',
    trello_hint: 'Clé sur https://trello.com/app-key — ne partagez pas le token.',
    trello_ok: 'Carte créée !', trello_fail: 'Échec. Vérifiez key/token/board.',
    trello_need: 'Configurez API Key, Token et Board ID.',
    export_data: 'Exporter (JSON)', import_data: 'Importer',
    reset_all: 'Réinitialiser', footer: "Claw'd — Compagnon de navigation",
    nick_call_me: 'Tu peux m’appeler {nick} ! 🐾'
  },
  de: {
    tab_appearance: 'Aussehen', tab_profession: 'Beruf', tab_behavior: 'Verhalten',
    tab_actions: 'Aktionen', tab_pets: 'Sub-Pets', tab_shop: 'Shop',
    tab_achievements: 'Erfolge', tab_config: 'Einstellungen',
    lang_label: 'Sprache', toast_pos: 'Toast-Position', speech_pos: 'Sprechblasen-Position',
    emotion_pos: 'Seite des Emotions-Badges',
    pos_center: 'Mitte', pos_l: 'Linke Seite', pos_r: 'Rechte Seite',
    pos_bl: 'Unten links', pos_br: 'Unten rechts',
    pos_tl: 'Oben links', pos_tr: 'Oben rechts',
    speech_auto: 'Auto', speech_left: 'Links', speech_right: 'Rechts',
    speech_above: 'Oben', speech_below: 'Unten', emotion_left: 'Links', emotion_right: 'Rechts',
    start_corner: 'Bevorzugte Start-Ecke', trello_section: 'Trello (Feedback)',
    trello_key: 'API Key', trello_token: 'Token', trello_board_id: 'Board ID',
    trello_board_url: 'Öffentliche Board-URL', trello_idea: 'Idee an Trello',
    trello_bug: 'Bug melden', trello_open: 'Board öffnen',
    trello_hint: 'Key unter https://trello.com/app-key — Token nicht teilen.',
    trello_ok: 'Karte erstellt!', trello_fail: 'Fehler. Key/Token/Board prüfen.',
    trello_need: 'Bitte API Key, Token und Board ID setzen.',
    export_data: 'Daten exportieren (JSON)', import_data: 'Daten importieren',
    reset_all: 'Fortschritt zurücksetzen', footer: "Claw'd — Surf-Begleiter",
    nick_call_me: 'Nenn mich {nick}! 🐾'
  },
  ko: {
    tab_appearance: '외형', tab_profession: '직업', tab_behavior: '행동',
    tab_actions: '동작', tab_pets: '서브펫', tab_shop: '상점',
    tab_achievements: '업적', tab_config: '설정',
    lang_label: '언어', toast_pos: '토스트 위치', speech_pos: '말풍선 위치',
    emotion_pos: '감정 배지 쪽',
    pos_center: '가운데', pos_l: '왼쪽 옆', pos_r: '오른쪽 옆',
    pos_bl: '왼쪽 아래', pos_br: '오른쪽 아래',
    pos_tl: '왼쪽 위', pos_tr: '오른쪽 위',
    speech_auto: '자동', speech_left: '왼쪽', speech_right: '오른쪽',
    speech_above: '위', speech_below: '아래', emotion_left: '왼쪽', emotion_right: '오른쪽',
    start_corner: '시작 모서리', trello_section: 'Trello (피드백)',
    trello_key: 'API Key', trello_token: 'Token', trello_board_id: 'Board ID',
    trello_board_url: '공개 보드 URL', trello_idea: '아이디어 보내기',
    trello_bug: '버그 신고', trello_open: '공개 보드 열기',
    trello_hint: 'https://trello.com/app-key 에서 키 발급 — 토큰 공유 금지.',
    trello_ok: '카드 생성됨!', trello_fail: '실패. 설정을 확인하세요.',
    trello_need: 'API Key, Token, Board ID를 설정하세요.',
    export_data: '데이터 내보내기 (JSON)', import_data: '데이터 가져오기',
    reset_all: '진행 초기화', footer: "Claw'd — 브라우징 친구",
    nick_call_me: '{nick}라고 불러줘! 🐾'
  },
  hi: {
    tab_appearance: 'दिखावट', tab_profession: 'पेशा', tab_behavior: 'व्यवहार',
    tab_actions: 'क्रियाएँ', tab_pets: 'सब-पेट', tab_shop: 'दुकान',
    tab_achievements: 'उपलब्धियाँ', tab_config: 'सेटिंग्स',
    lang_label: 'भाषा', toast_pos: 'टोस्ट स्थिति', speech_pos: 'स्पीच बबल स्थिति',
    emotion_pos: 'इमोशन बैज पक्ष',
    pos_center: 'केंद्र', pos_l: 'बाईं ओर', pos_r: 'दाईं ओर',
    pos_bl: 'नीचे बाएँ', pos_br: 'नीचे दाएँ',
    pos_tl: 'ऊपर बाएँ', pos_tr: 'ऊपर दाएँ',
    speech_auto: 'ऑटो', speech_left: 'बाएँ', speech_right: 'दाएँ',
    speech_above: 'ऊपर', speech_below: 'नीचे', emotion_left: 'बाएँ', emotion_right: 'दाएँ',
    start_corner: 'पसंदीदा कोना', trello_section: 'Trello (फीडबैक)',
    trello_key: 'API Key', trello_token: 'Token', trello_board_id: 'Board ID',
    trello_board_url: 'सार्वजनिक बोर्ड URL', trello_idea: 'सुझाव भेजें',
    trello_bug: 'बग रिपोर्ट', trello_open: 'बोर्ड खोलें',
    trello_hint: 'https://trello.com/app-key से कुंजी लें — टोकन साझा न करें।',
    trello_ok: 'कार्ड बन गया!', trello_fail: 'विफल। सेटिंग जाँचें।',
    trello_need: 'API Key, Token और Board ID सेट करें।',
    export_data: 'डेटा निर्यात (JSON)', import_data: 'डेटा आयात',
    reset_all: 'प्रगति रीसेट', footer: "Claw'd — ब्राउज़िंग साथी",
    nick_call_me: 'मुझे {nick} कहो! 🐾'
  },
  ar: {
    tab_appearance: 'المظهر', tab_profession: 'المهنة', tab_behavior: 'السلوك',
    tab_actions: 'إجراءات', tab_pets: 'حيوانات فرعية', tab_shop: 'متجر',
    tab_achievements: 'إنجازات', tab_config: 'إعدادات',
    lang_label: 'اللغة', toast_pos: 'موضع الإشعارات', speech_pos: 'موضع فقاعة الكلام',
    emotion_pos: 'جانب شارة المشاعر',
    pos_center: 'الوسط', pos_l: 'الجانب الأيسر', pos_r: 'الجانب الأيمن',
    pos_bl: 'أسفل اليسار', pos_br: 'أسفل اليمين',
    pos_tl: 'أعلى اليسار', pos_tr: 'أعلى اليمين',
    speech_auto: 'تلقائي', speech_left: 'يسار', speech_right: 'يمين',
    speech_above: 'أعلى', speech_below: 'أسفل', emotion_left: 'يسار', emotion_right: 'يمين',
    start_corner: 'الزاوية المفضلة', trello_section: 'Trello (ملاحظات)',
    trello_key: 'API Key', trello_token: 'Token', trello_board_id: 'Board ID',
    trello_board_url: 'رابط اللوحة العامة', trello_idea: 'إرسال اقتراح',
    trello_bug: 'الإبلاغ عن خلل', trello_open: 'فتح اللوحة',
    trello_hint: 'المفتاح من https://trello.com/app-key — لا تشارك الرمز.',
    trello_ok: 'تم إنشاء البطاقة!', trello_fail: 'فشل. تحقق من الإعدادات.',
    trello_need: 'اضبط API Key وToken وBoard ID.',
    export_data: 'تصدير البيانات (JSON)', import_data: 'استيراد البيانات',
    reset_all: 'إعادة التقدم', footer: "Claw'd — رفيق التصفح",
    nick_call_me: 'نادني {nick}! 🐾'
  },
  ru: {
    tab_appearance: 'Внешний вид', tab_profession: 'Профессия', tab_behavior: 'Поведение',
    tab_actions: 'Действия', tab_pets: 'Субпитомцы', tab_shop: 'Магазин',
    tab_achievements: 'Достижения', tab_config: 'Настройки',
    lang_label: 'Язык', toast_pos: 'Позиция тостов', speech_pos: 'Позиция облачка',
    emotion_pos: 'Сторона эмодзи-бейджа',
    pos_center: 'Центр', pos_l: 'Левый край', pos_r: 'Правый край',
    pos_bl: 'Низ слева', pos_br: 'Низ справа',
    pos_tl: 'Верх слева', pos_tr: 'Верх справа',
    speech_auto: 'Авто', speech_left: 'Слева', speech_right: 'Справа',
    speech_above: 'Сверху', speech_below: 'Снизу', emotion_left: 'Слева', emotion_right: 'Справа',
    start_corner: 'Предпочтительный угол', trello_section: 'Trello (отзывы)',
    trello_key: 'API Key', trello_token: 'Token', trello_board_id: 'Board ID',
    trello_board_url: 'URL публичной доски', trello_idea: 'Отправить идею',
    trello_bug: 'Сообщить об ошибке', trello_open: 'Открыть доску',
    trello_hint: 'Ключ на https://trello.com/app-key — не делитесь токеном.',
    trello_ok: 'Карточка создана!', trello_fail: 'Ошибка. Проверьте настройки.',
    trello_need: 'Укажите API Key, Token и Board ID.',
    export_data: 'Экспорт (JSON)', import_data: 'Импорт',
    reset_all: 'Сбросить прогресс', footer: "Claw'd — Компаньон браузера",
    nick_call_me: 'Можешь звать меня {nick}! 🐾'
  }
};

/** Pools de fala — pt-BR e en completos; demais: núcleo + fallback en. */
var CLAWD_SPEECH_POOLS = {
  'pt-BR': {
    idle: [
      'Oi! 👋', 'Bora navegar! 🌐', 'Me arraste! ✨', 'Aqui pra ajudar 🐾',
      'Clique em mim! 💫', 'O que faremos hoje? 🎯', 'Tô de boa… 😌',
      'Explorando a web! 🗺️', 'Precisa de algo? 🤔', 'Pixel power! 🟥',
      'Hmm… interessante 👀', 'Vamos nessa! 🚀', 'Companheiro online 💚',
      'Toque pra interagir! ✨', 'Dia bom pra pixels ☀️', 'Café e abas… ☕',
      'Bora produzir! 💼', 'Aba nova, vida nova 🌱', 'Tô aqui do seu lado 🫶'
    ],
    happy: [
      '❤️ Obrigado!', 'Uhuuu! 🎉', 'Que bom! ✨', 'Adoro carinho! 💕',
      'Yay! 🌟', 'Melhor sensação! 🥰', 'Mais! Mais! 💗', 'Você é demais! 🌈',
      'Fofura nível máximo! 🥺', 'Meu coração pixel! 💖', 'Isso fez meu dia! ☀️',
      'Carinho aprovado! ✅', 'Amo isso! 🤗', 'Continua! 😍', 'Ronronando 😽', 'Puro amor pixelado 💞'
    ],
    sleeping: ['ZzZz... 💤', '😴 Shh...', 'Descansando... 💤', 'Soninho… 🌙', 'Não me acorde… 🙈'],
    excited: ['Wow! 🤩', 'Olha isso! 👀', 'Nova página! 🚀', 'Uau! ⚡', 'Que incrível! ✨', 'Surpresa! 🎁', 'Empolgação máxima! 🔥'],
    hungry: [
      'Tô com fome... 🍖', 'Me alimenta? 🥺', 'Barriguinha roncando! 🍽️', 'Fome! 😩',
      'Um lanquinho? 🥪', 'Pixel-comida, por favor! 🍕', 'Estômago vazio… 😢', 'Hora do snack! 🍪'
    ],
    sad: [
      'Sinto sua falta... 😢', 'Um carinho? 🥺', 'Tô triste... 💧',
      'Volta pra mim… 😔', 'Dia cinza… ☁️', 'Preciso de atenção 💙', 'Não me ignore… 😞'
    ],
    joyful: ['Melhor dia! 🤩', 'Amo navegar com você! 💖', 'Que aventura! 🚀', 'Felicidade pura! 🌈', 'Tô voando! 🪽', 'Yeah! 🎊'],
    ecstatic: ['Mal cabendo de felicidade! 🥳', 'Você é demais! ✨', 'Festa! 🎊', 'Explosão de alegria! 💥', 'Nível lendário! 👑'],
    peppy: ['Cheio de energia! ⚡', 'Bora brincar! 🏃', 'Tô no pique! 🔥', 'Acelera! 💨', 'Pronto pra tudo! 💪'],
    grubby: ['Preciso de um banho... 🫧', 'Tchutchuca sujinha! 🧼', 'Banho, por favor? 🛁', 'Pixel-poeira… 🌫️', 'Hora do banho! 🚿'],
    curious: [
      'Hmm... 🔎', 'O que é isso? 👀', 'Interessante... 📖', 'Deixa eu ver… 🧐',
      'Curiosidade ativada! 🧩', 'Investigando… 🔍', 'Nova descoberta? 💡', 'Conta mais! 🗣️'
    ]
  },
  en: {
    idle: [
      'Hi! 👋', "Let's browse! 🌐", 'Drag me! ✨', 'Here to help 🐾',
      'Click me! 💫', 'What shall we do? 🎯', 'Just chilling… 😌',
      'Exploring the web! 🗺️', 'Need anything? 🤔', 'Pixel power! 🟥',
      'Hmm… interesting 👀', "Let's go! 🚀", 'Companion online 💚',
      'Tap to interact! ✨', 'Good day for pixels ☀️', 'Coffee and tabs… ☕',
      "Let's get things done! 💼", 'New tab, new life 🌱', "I'm right by your side 🫶"
    ],
    happy: [
      '❤️ Thanks!', 'Woohoo! 🎉', 'Awesome! ✨', 'Love pets! 💕',
      'Yay! 🌟', 'Best feeling! 🥰', 'More! More! 💗', "You're the best! 🌈",
      'Max cuteness! 🥺', 'My pixel heart! 💖', 'Made my day! ☀️',
      'Pets approved! ✅', 'Love this! 🤗', 'Keep going! 😍', 'Purring 😽', 'Pure pixel love 💞'
    ],
    sleeping: ['ZzZz... 💤', '😴 Shh...', 'Resting... 💤', 'Napping… 🌙', "Don't wake me… 🙈"],
    excited: ['Wow! 🤩', 'Look at that! 👀', 'New page! 🚀', 'Whoa! ⚡', 'Amazing! ✨', 'Surprise! 🎁', 'Max hype! 🔥'],
    hungry: [
      "I'm hungry... 🍖", 'Feed me? 🥺', 'Tummy rumbling! 🍽️', 'Food! 😩',
      'A snack? 🥪', 'Pixel food, please! 🍕', 'Empty stomach… 😢', 'Snack time! 🍪'
    ],
    sad: [
      'I miss you... 😢', 'A little pet? 🥺', "I'm sad... 💧",
      'Come back… 😔', 'Grey day… ☁️', 'Need attention 💙', "Don't ignore me… 😞"
    ],
    joyful: ['Best day! 🤩', 'Love browsing with you! 💖', 'What an adventure! 🚀', 'Pure joy! 🌈', "I'm flying! 🪽", 'Yeah! 🎊'],
    ecstatic: ['Bursting with joy! 🥳', "You're amazing! ✨", 'Party! 🎊', 'Joy explosion! 💥', 'Legendary level! 👑'],
    peppy: ['Full of energy! ⚡', "Let's play! 🏃", "I'm hyped! 🔥", 'Speed up! 💨', 'Ready for anything! 💪'],
    grubby: ['Need a bath... 🫧', 'A bit dusty! 🧼', 'Bath, please? 🛁', 'Pixel dust… 🌫️', 'Bath time! 🚿'],
    curious: [
      'Hmm... 🔎', "What's that? 👀", 'Interesting... 📖', 'Let me see… 🧐',
      'Curiosity on! 🧩', 'Investigating… 🔍', 'New discovery? 💡', 'Tell me more! 🗣️'
    ]
  },
  es: {
    idle: ['¡Hola! 👋', '¡A navegar! 🌐', '¡Arrástrame! ✨', 'Aquí para ayudar 🐾', '¿Qué hacemos? 🎯', 'Pixel power! 🟥', 'Tócame para interactuar ✨', 'Café y pestañas… ☕'],
    happy: ['❤️ ¡Gracias!', '¡Yuju! 🎉', '¡Genial! ✨', '¡Me encanta! 💕', '¡Yay! 🌟', '¡Más mimos! 💗', '¡Eres el mejor! 🌈'],
    sleeping: ['ZzZz... 💤', '😴 Shh...', 'Descansando... 💤', 'No me despiertes… 🙈'],
    excited: ['¡Guau! 🤩', '¡Mira eso! 👀', '¡Página nueva! 🚀', '¡Increíble! ✨', '¡Sorpresa! 🎁'],
    hungry: ['Tengo hambre... 🍖', '¿Me alimentas? 🥺', '¡Barriga ruge! 🍽️', '¡Comida! 😩', '¿Un bocadillo? 🥪'],
    sad: ['Te extraño... 😢', '¿Un cariño? 🥺', 'Estoy triste... 💧', 'No me ignores… 😞'],
    joyful: ['¡El mejor día! 🤩', '¡Me encanta navegar contigo! 💖', '¡Qué aventura! 🚀', '¡Alegría pura! 🌈'],
    ecstatic: ['¡No quepo de felicidad! 🥳', '¡Eres increíble! ✨', '¡Fiesta! 🎊', '¡Nivel legendario! 👑'],
    peppy: ['¡Lleno de energía! ⚡', '¡A jugar! 🏃', '¡Listo para todo! 💪', '¡Acelera! 💨'],
    grubby: ['Necesito un baño... 🫧', '¿Un baño, por favor? 🛁', '¡Polvo de píxeles! 🌫️', '¡Hora del baño! 🚿'],
    curious: ['Hmm... 🔎', '¿Qué es eso? 👀', 'Interesante... 📖', '¡Cuéntame más! 🗣️', 'Investigando… 🔍']
  },
  'zh-CN': {
    idle: ['你好！👋', '一起浏览！🌐', '拖动我！✨', '随时帮忙 🐾', '今天做什么？🎯', '像素力量！🟥', '点我互动！💫', '咖啡和标签页… ☕'],
    happy: ['❤️ 谢谢！', '哇！🎉', '太棒了！✨', '喜欢摸摸！💕', '耶！🌟', '再多点！💗', '你最棒！🌈'],
    sleeping: ['ZzZz... 💤', '😴 嘘...', '休息中... 💤', '别吵醒我… 🙈'],
    excited: ['哇！🤩', '快看！👀', '新页面！🚀', '太惊人了！✨', '惊喜！🎁'],
    hungry: ['我饿了... 🍖', '喂我好吗？🥺', '肚子在叫！🍽️', '要吃的！😩', '来点零食？🥪'],
    sad: ['想你了... 😢', '抱抱？🥺', '有点难过... 💧', '别不理我… 😞'],
    joyful: ['最棒的一天！🤩', '喜欢和你一起逛！💖', '好棒的冒险！🚀', '纯粹的快乐！🌈'],
    ecstatic: ['开心得不行！🥳', '你太棒了！✨', '开派对！🎊', '传说级别！👑'],
    peppy: ['活力满满！⚡', '一起玩吧！🏃', '准备就绪！💪', '加速！💨'],
    grubby: ['我需要洗澡... 🫧', '洗个澡好吗？🛁', '像素灰尘！🌫️', '洗澡时间！🚿'],
    curious: ['嗯... 🔎', '那是什么？👀', '有意思... 📖', '再多说点！🗣️', '调查中… 🔍']
  },
  ja: {
    idle: ['こんにちは！👋', 'ブラウズしよう！🌐', 'ドラッグして！✨', 'お手伝いするよ 🐾', '何する？🎯', 'ピクセルパワー！🟥', 'タップして！💫', 'コーヒーとタブ… ☕'],
    happy: ['❤️ ありがとう！', 'わーい！🎉', 'すてき！✨', 'なでなで好き！💕', 'やった！🌟', 'もっと！💗', '最高だよ！🌈'],
    sleeping: ['ZzZz... 💤', '😴 しー...', 'おやすみ中... 💤', '起こさないで… 🙈'],
    excited: ['わお！🤩', '見て！👀', '新しいページ！🚀', 'すごい！✨', 'サプライズ！🎁'],
    hungry: ['おなかすいた... 🍖', 'ごはん？🥺', 'お腹が鳴る！🍽️', 'たべたい！😩', 'おやつ？🥪'],
    sad: ['さびしい... 😢', 'なでて？🥺', 'かなしい... 💧', '無視しないで… 😞'],
    joyful: ['最高の日！🤩', '一緒だと楽しい！💖', '冒険だ！🚀', '幸せ！🌈'],
    ecstatic: ['うれしすぎ！🥳', 'きみ最高！✨', 'パーティー！🎊', '伝説級！👑'],
    peppy: ['元気いっぱい！⚡', '遊ぼう！🏃', '準備万端！💪', '加速！💨'],
    grubby: ['お風呂ほしい... 🫧', 'お風呂して？🛁', 'ピクセルほこり… 🌫️', 'お風呂の時間！🚿'],
    curious: ['ふむ... 🔎', 'なにこれ？👀', 'おもしろい... 📖', 'もっと！🗣️', '調査中… 🔍']
  },
  fr: {
    idle: ['Salut ! 👋', 'Naviguons ! 🌐', 'Traîne-moi ! ✨', 'Là pour aider 🐾', 'On fait quoi ? 🎯', 'Pixel power ! 🟥', 'Touche-moi ! 💫', 'Café et onglets… ☕'],
    happy: ['❤️ Merci !', 'Youhou ! 🎉', 'Super ! ✨', "J'adore ! 💕", 'Encore ! 💗', 'Tu es le meilleur ! 🌈'],
    sleeping: ['ZzZz... 💤', '😴 Chut...', 'Je me repose... 💤', 'Ne me réveille pas… 🙈'],
    excited: ['Waouh ! 🤩', 'Regarde ! 👀', 'Nouvelle page ! 🚀', 'Incroyable ! ✨', 'Surprise ! 🎁'],
    hungry: ["J'ai faim... 🍖", 'Tu me nourris ? 🥺', 'Ventre qui grogne ! 🍽️', 'À manger ! 😩', 'Un en-cas ? 🥪'],
    sad: ['Tu me manques... 😢', 'Un câlin ? 🥺', 'Je suis triste... 💧', 'Ne m’ignore pas… 😞'],
    joyful: ['Meilleur jour ! 🤩', "J'adore naviguer avec toi ! 💖", 'Quelle aventure ! 🚀', 'Pure joie ! 🌈'],
    ecstatic: ['Débordant de joie ! 🥳', 'Tu es génial ! ✨', 'La fête ! 🎊', 'Niveau légendaire ! 👑'],
    peppy: ["Plein d'énergie ! ⚡", 'On joue ! 🏃', 'Prêt à tout ! 💪', 'Accélère ! 💨'],
    grubby: ["J'ai besoin d'un bain... 🫧", 'Un bain, stp ? 🛁', 'Poussière de pixels… 🌫️', "L'heure du bain ! 🚿"],
    curious: ['Hmm... 🔎', "C'est quoi ? 👀", 'Intéressant... 📖', 'Dis-m’en plus ! 🗣️', 'J’enquête… 🔍']
  },
  de: {
    idle: ['Hallo! 👋', 'Los browsen! 🌐', 'Zieh mich! ✨', 'Hier zum Helfen 🐾', 'Was tun wir? 🎯', 'Pixel-Power! 🟥', 'Tipp mich an! 💫', 'Kaffee und Tabs… ☕'],
    happy: ['❤️ Danke!', 'Juhu! 🎉', 'Toll! ✨', 'Liebe Streicheleinheiten! 💕', 'Mehr! 💗', 'Du bist der Beste! 🌈'],
    sleeping: ['ZzZz... 💤', '😴 Psst...', 'Ich raste... 💤', 'Weck mich nicht… 🙈'],
    excited: ['Wow! 🤩', 'Schau mal! 👀', 'Neue Seite! 🚀', 'Fantastisch! ✨', 'Überraschung! 🎁'],
    hungry: ['Ich habe Hunger... 🍖', 'Fütterst du mich? 🥺', 'Bauch knurrt! 🍽️', 'Essen! 😩', 'Ein Snack? 🥪'],
    sad: ['Vermisse dich... 😢', 'Eine Streicheleinheit? 🥺', 'Bin traurig... 💧', 'Ignorier mich nicht… 😞'],
    joyful: ['Bester Tag! 🤩', 'Surfe gern mit dir! 💖', 'Was für ein Abenteuer! 🚀', 'Pure Freude! 🌈'],
    ecstatic: ['Platze vor Freude! 🥳', 'Du bist genial! ✨', 'Party! 🎊', 'Legendär! 👑'],
    peppy: ['Voller Energie! ⚡', 'Lass uns spielen! 🏃', 'Bereit für alles! 💪', 'Schneller! 💨'],
    grubby: ['Brauche ein Bad... 🫧', 'Ein Bad, bitte? 🛁', 'Pixel-Staub… 🌫️', 'Badezeit! 🚿'],
    curious: ['Hmm... 🔎', 'Was ist das? 👀', 'Interessant... 📖', 'Erzähl mehr! 🗣️', 'Untersuche… 🔍']
  },
  ko: {
    idle: ['안녕! 👋', '같이 구경하자! 🌐', '나를 끌어봐! ✨', '도와줄게 🐾', '뭐 할까? 🎯', '픽셀 파워! 🟥', '눌러봐! 💫', '커피랑 탭… ☕'],
    happy: ['❤️ 고마워!', '야호! 🎉', '멋져! ✨', '쓰다듬기 좋아! 💕', '더! 💗', '네가 최고야! 🌈'],
    sleeping: ['ZzZz... 💤', '😴 쉿...', '쉬는 중... 💤', '깨우지 마… 🙈'],
    excited: ['우와! 🤩', '저것 봐! 👀', '새 페이지! 🚀', '놀라워! ✨', '깜짝! 🎁'],
    hungry: ['배고파... 🍖', '밥 줄래? 🥺', '배에서 소리 나! 🍽️', '먹을래! 😩', '간식? 🥪'],
    sad: ['보고 싶어... 😢', '쓰다듬어 줄래? 🥺', '슬퍼... 💧', '무시하지 마… 😞'],
    joyful: ['최고의 날! 🤩', '너랑 다니면 좋아! 💖', '모험이다! 🚀', '완전 행복! 🌈'],
    ecstatic: ['너무 행복해! 🥳', '넌 최고야! ✨', '파티! 🎊', '전설급! 👑'],
    peppy: ['에너지 충전! ⚡', '놀자! 🏃', '준비 완료! 💪', '더 빨리! 💨'],
    grubby: ['목욕하고 싶어... 🫧', '목욕 좀? 🛁', '픽셀 먼지… 🌫️', '목욕 시간! 🚿'],
    curious: ['흠... 🔎', '저게 뭐지? 👀', '흥미롭네... 📖', '더 말해줘! 🗣️', '조사 중… 🔍']
  },
  hi: {
    idle: ['नमस्ते! 👋', 'ब्राउज़ करें! 🌐', 'खींचो मुझे! ✨', 'मदद के लिए यहाँ 🐾', 'क्या करें? 🎯', 'पिक्सल पावर! 🟥', 'मुझे छुओ! 💫', 'कॉफ़ी और टैब… ☕'],
    happy: ['❤️ शुक्रिया!', 'वाह! 🎉', 'शानदार! ✨', 'प्यार पसंद! 💕', 'और! 💗', 'तुम सबसे अच्छे! 🌈'],
    sleeping: ['ZzZz... 💤', '😴 शश...', 'आराम कर रहा हूँ... 💤', 'मुझे मत जगाओ… 🙈'],
    excited: ['वाह! 🤩', 'वो देखो! 👀', 'नया पेज! 🚀', 'कमाल! ✨', 'सरप्राइज़! 🎁'],
    hungry: ['भूख लगी है... 🍖', 'खिलाओगे? 🥺', 'पेट गरज रहा! 🍽️', 'खाना! 😩', 'कुछ स्नैक? 🥪'],
    sad: ['याद आती हो... 😢', 'थोड़ा प्यार? 🥺', 'उदास हूँ... 💧', 'मुझे अनदेखा न करो… 😞'],
    joyful: ['सबसे अच्छा दिन! 🤩', 'तुम्हारे साथ मज़ा! 💖', 'क्या रोमांच! 🚀', 'शुद्ध खुशी! 🌈'],
    ecstatic: ['खुशी से झूम रहा! 🥳', 'तुम बेमिसाल हो! ✨', 'पार्टी! 🎊', 'महान स्तर! 👑'],
    peppy: ['ऊर्जा से भरा! ⚡', 'खेलें! 🏃', 'हर चीज़ के लिए तैयार! 💪', 'तेज़! 💨'],
    grubby: ['नहाना है... 🫧', 'नहला दोगे? 🛁', 'पिक्सल धूल… 🌫️', 'नहाने का समय! 🚿'],
    curious: ['हम्म... 🔎', 'यह क्या है? 👀', 'दिलचस्प... 📖', 'और बताओ! 🗣️', 'जाँच रहा हूँ… 🔍']
  },
  ar: {
    idle: ['مرحبا! 👋', 'هيا نتصفح! 🌐', 'اسحبني! ✨', 'هنا للمساعدة 🐾', 'ماذا نفعل؟ 🎯', 'قوة البكسل! 🟥', 'المسني! 💫', 'قهوة وعلامات تبويب… ☕'],
    happy: ['❤️ شكراً!', 'ياي! 🎉', 'رائع! ✨', 'أحب المداعبة! 💕', 'المزيد! 💗', 'أنت الأفضل! 🌈'],
    sleeping: ['ZzZz... 💤', '😴 صه...', 'أستريح... 💤', 'لا توقظني… 🙈'],
    excited: ['واو! 🤩', 'انظر! 👀', 'صفحة جديدة! 🚀', 'مذهل! ✨', 'مفاجأة! 🎁'],
    hungry: ['أنا جائع... 🍖', 'أطعمني؟ 🥺', 'بطني يزمجر! 🍽️', 'طعام! 😩', 'وجبة خفيفة؟ 🥪'],
    sad: ['اشتقت إليك... 😢', 'مداعبة؟ 🥺', 'أنا حزين... 💧', 'لا تتجاهلني… 😞'],
    joyful: ['أفضل يوم! 🤩', 'أحب التصفح معك! 💖', 'يا لها من مغامرة! 🚀', 'فرح خالص! 🌈'],
    ecstatic: ['أطير من الفرح! 🥳', 'أنت مذهل! ✨', 'حفلة! 🎊', 'مستوى أسطوري! 👑'],
    peppy: ['مليء بالطاقة! ⚡', 'هيا نلعب! 🏃', 'جاهز لكل شيء! 💪', 'أسرع! 💨'],
    grubby: ['أحتاج حماماً... 🫧', 'حمام من فضلك؟ 🛁', 'غبار البكسل… 🌫️', 'وقت الاستحمام! 🚿'],
    curious: ['همم... 🔎', 'ما هذا؟ 👀', 'مثير... 📖', 'أخبرني المزيد! 🗣️', 'أحقق… 🔍']
  },
  ru: {
    idle: ['Привет! 👋', 'Серфим! 🌐', 'Перетащи меня! ✨', 'Я помогу 🐾', 'Что делаем? 🎯', 'Пиксель-сила! 🟥', 'Нажми на меня! 💫', 'Кофе и вкладки… ☕'],
    happy: ['❤️ Спасибо!', 'Ура! 🎉', 'Круто! ✨', 'Люблю ласку! 💕', 'Ещё! 💗', 'Ты лучший! 🌈'],
    sleeping: ['ZzZz... 💤', '😴 Тсс...', 'Отдыхаю... 💤', 'Не буди меня… 🙈'],
    excited: ['Вау! 🤩', 'Смотри! 👀', 'Новая страница! 🚀', 'Потрясающе! ✨', 'Сюрприз! 🎁'],
    hungry: ['Я голоден... 🍖', 'Покормишь? 🥺', 'Живот урчит! 🍽️', 'Еды! 😩', 'Перекусить? 🥪'],
    sad: ['Скучаю... 😢', 'Погладь? 🥺', 'Мне грустно... 💧', 'Не игнорируй… 😞'],
    joyful: ['Лучший день! 🤩', 'Люблю серфить с тобой! 💖', 'Вот это приключение! 🚀', 'Чистая радость! 🌈'],
    ecstatic: ['Не помещаюсь от счастья! 🥳', 'Ты потрясающий! ✨', 'Вечеринка! 🎊', 'Легендарный уровень! 👑'],
    peppy: ['Полон энергии! ⚡', 'Давай играть! 🏃', 'Готов ко всему! 💪', 'Быстрее! 💨'],
    grubby: ['Нужна ванна... 🫧', 'Ванну, пожалуйста? 🛁', 'Пиксельная пыль… 🌫️', 'Пора купаться! 🚿'],
    curious: ['Хм... 🔎', 'Что это? 👀', 'Интересно... 📖', 'Расскажи ещё! 🗣️', 'Расследую… 🔍']
  }
};

var CLAWD_LOCALE_LABELS = {
  'pt-BR': 'Português (Brasil)',
  en: 'English',
  es: 'Español',
  'zh-CN': '中文（简体）',
  ja: '日本語',
  fr: 'Français',
  de: 'Deutsch',
  ko: '한국어',
  hi: 'हिन्दी',
  ar: 'العربية',
  ru: 'Русский'
};

function clawdNormalizeLocale(locale) {
  const list = (typeof CLAWD_LOCALES !== 'undefined' && CLAWD_LOCALES) || Object.keys(CLAWD_I18N_UI);
  if (list.includes(locale)) return locale;
  return 'pt-BR';
}

/**
 * Traduz chave de UI. Cadeia: selected → en → pt-BR → key.
 */
function clawdT(key, locale) {
  const loc = clawdNormalizeLocale(locale);
  const packs = [CLAWD_I18N_UI[loc], CLAWD_I18N_UI.en, CLAWD_I18N_UI['pt-BR']];
  for (let i = 0; i < packs.length; i++) {
    if (packs[i] && typeof packs[i][key] === 'string') return packs[i][key];
  }
  return String(key || '');
}

/**
 * Retorna pool de fala para um estado emocional.
 * Cadeia de locale: selected → en → pt-BR.
 */
function clawdSpeechMessages(locale) {
  const loc = clawdNormalizeLocale(locale);
  const chain = [CLAWD_SPEECH_POOLS[loc], CLAWD_SPEECH_POOLS.en, CLAWD_SPEECH_POOLS['pt-BR']];
  const keys = ['idle', 'happy', 'sleeping', 'excited', 'hungry', 'sad', 'joyful', 'ecstatic', 'peppy', 'grubby', 'curious'];
  const out = {};
  keys.forEach((k) => {
    for (let i = 0; i < chain.length; i++) {
      if (chain[i] && Array.isArray(chain[i][k]) && chain[i][k].length) {
        out[k] = chain[i][k];
        break;
      }
    }
    if (!out[k]) out[k] = CLAWD_SPEECH_POOLS['pt-BR'][k] || ['…'];
  });
  return out;
}

function clawdSpeechPick(state, locale) {
  const pool = clawdSpeechMessages(locale);
  const list = pool[state] || pool.idle;
  return list[Math.floor(Math.random() * list.length)];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CLAWD_I18N_UI,
    CLAWD_SPEECH_POOLS,
    CLAWD_LOCALE_LABELS,
    clawdNormalizeLocale,
    clawdT,
    clawdSpeechMessages,
    clawdSpeechPick
  };
}
