'use strict';
const {OGE_BANKS} = require('./oge-catalog');

// Shared catalogue CSS, generated once per subject when the server starts.
module.exports = function catalogueStyles(section) {
  const isPhysics = section === 'physics';
  const isOge = Object.hasOwn(OGE_BANKS, section);
  return `

    html { width: 100%; max-width: 100%; min-width: 0 !important; overflow-x: hidden; }
    *, *::before, *::after { box-sizing: border-box; }
    html.added-loading .task-header-panel,
    html.added-loading .qblock { display: none !important; }
    html.page-loading .task-header-panel,
    html.page-loading .qblock,
    html.page-loading .local-pager { visibility: hidden !important; }
    html.page-loading body::after { content: 'Подготовка заданий…'; display: block; position: fixed; left: 50%; top: 45%; transform: translate(-50%, -50%); margin: 0; padding: 12px 18px; border-radius: 8px; background: #fff; z-index: 20; pointer-events: none; text-align: center;
      color: #526273; font: 15px Arial, sans-serif; }
    math { font-family: 'Cambria Math', 'STIX Two Math', serif; }
    .fipi-math-scroll { display: inline-block; max-width: 100%; vertical-align: middle; overflow-x: auto; }
    /* Поле ответа size=40 в выгрузке ФИПИ иначе задаёт минимальную ширину всей таблицы условия. */
    .qblock > form > table { width: 100%; table-layout: fixed; }
    /* Однострочные таблицы Word служат раскладкой условия и рисунка, а не данными. */
    .qblock .cell_0 table:is(.MsoNormalTable, .MsoTableGrid):has(> tbody > tr:only-child > td:nth-child(2)):has(img) { width: 100% !important; table-layout: fixed; }
    .qblock .cell_0 table:is(.MsoNormalTable, .MsoTableGrid):has(> tbody > tr:only-child > td:nth-child(2)):has(img) > tbody > tr { display: flex; flex-wrap: wrap; }
    .qblock .cell_0 table:is(.MsoNormalTable, .MsoTableGrid):has(> tbody > tr:only-child > td:nth-child(2)):has(img) > tbody > tr > td { flex: 1 1 220px; width: auto !important; min-width: 0; max-width: 100%; }
    .qblock .cell_0 table:is(.MsoNormalTable, .MsoTableGrid) img { max-width: 100%; height: auto; }
    ${section === 'oge' ? `/* Отступы Word у таблицы шириной 100% выталкивают рисунок за границу условия. */
    .qblock .cell_0 table.MsoNormalTable[width="100%"][align="left"] { margin-inline: 0 !important; }
    /* В исходнике A92357 ширина таблицы 101%; все столбцы помещаются при 100%. */
    .qblock .cell_0 table.MsoNormalTable[width="101%"] { width: 100%; }` : ''}
    ${isPhysics || section === 'oge-physics' ? `/* Таблицы ответов ФИПИ имеют ширину в пикселях; на телефоне сохраняем столбцы и переносим текст. */
    @media (max-width: 600px) {
      .qblock .cell_0 table { max-width: 100%; }
      .qblock .cell_0 td { overflow-wrap: anywhere; }
      .qblock .cell_0 td[width="0"] { white-space: nowrap; overflow-wrap: normal; }
      /* Только трёхколоночные соответствия: А/Б, пустой разделитель, варианты. Двухколоночные списки терминов остаются целиком. */
      .qblock .cell_0 table:has(> tbody > tr:first-child > td > b > u):has(> tbody > tr:first-child > td:nth-child(3)) { display: grid; grid-template-columns: minmax(0, 1fr); width: 100% !important; }
      .qblock .cell_0 table:has(> tbody > tr:first-child > td > b > u):has(> tbody > tr:first-child > td:nth-child(3)) > tbody,
      .qblock .cell_0 table:has(> tbody > tr:first-child > td > b > u):has(> tbody > tr:first-child > td:nth-child(3)) > tbody > tr { display: contents; }
      .qblock .cell_0 table:has(> tbody > tr:first-child > td > b > u):has(> tbody > tr:first-child > td:nth-child(3)) > tbody > tr > td { width: auto !important; min-width: 0; text-align: left; }
      .qblock .cell_0 table:has(> tbody > tr:first-child > td > b > u):has(> tbody > tr:first-child > td:nth-child(3)) > tbody > tr > td:nth-child(2) { display: none; }
      .qblock .cell_0 table:has(> tbody > tr:first-child > td > b > u):has(> tbody > tr:first-child > td:nth-child(3)) > tbody > tr:first-child > td:first-child { grid-row: 1; }
      .qblock .cell_0 table:has(> tbody > tr:first-child > td > b > u):has(> tbody > tr:first-child > td:nth-child(3)) > tbody > tr:nth-child(2) > td:first-child { grid-row: 2; }
      .qblock .cell_0 table:has(> tbody > tr:first-child > td > b > u):has(> tbody > tr:first-child > td:nth-child(3)) > tbody > tr:first-child > td:nth-child(3) { grid-row: 3; margin-top: 12px; }
      .qblock .cell_0 table:has(> tbody > tr:first-child > td > b > u):has(> tbody > tr:first-child > td:nth-child(3)) > tbody > tr:nth-child(2) > td:nth-child(3) { grid-row: 4; }
      .qblock .cell_0 table:is(.MsoNormalTable, .MsoTableGrid)[border="1"] { width: 100% !important; table-layout: fixed; }
      .qblock .cell_0 table:is(.MsoNormalTable, .MsoTableGrid)[border="1"] td { width: auto !important; overflow-wrap: anywhere; }
    }` : ''}

    .qblock .varinats-block input[type="text"] { width: 100%; min-width: 0; max-width: 100%; }
    ${section === 'oge-informatics' ? `
    /* Seven sequence selectors and long Word separator lines must fit a phone. */
    .qblock .answer-table { width: 100%; table-layout: fixed; }
    .qblock .answer-table td { padding: 2px; }
    .qblock .answer-table select { width: 100% !important; min-width: 0; max-width: 100%; }
    .qblock .cell_0 p { overflow-wrap: anywhere; }
    /* FIPI wraps spreadsheets in a bare layout table; it must not inherit the inner data table's minimum width. */
    .qblock .cell_0 table:not([class]):has(table.MsoNormalTable) { width: 100%; table-layout: fixed; }
    .qblock .cell_0 table.MsoNormalTable[width="101%"] { width: 100%; }
    .oge-study-types { margin-bottom: 24px; }
    .oge-study-types .math-topic-major { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid #cbd7e4; border-radius: 8px; background: #fff; text-decoration: none; }
    .oge-study-types .math-topic-major.active { background: #e8f2ff; border-color: #1769aa; }
    ` : ''}
    ${isOge ? `
    .qblock > form > table, .qblock .submit-outblock, .qblock .varinats-block > div > table { width: 100%; table-layout: fixed; }
    /* Нулевые ширины колонок ФИПИ в fixed-таблице накладывают номер ответа на текст. */
    .qblock .varinats-block > div > table.distractors-table { table-layout: auto; }
    .qblock .distractors-table > tbody > tr > td { vertical-align: top; }
    .qblock .distractors-table > tbody > tr > td[width="0"] { width: 1%; white-space: nowrap; }
    .qblock .distractors-table p { margin: 0; }
    .qblock input[type="text"] { width: min(100%, 365px); max-width: 100%; min-width: 0; margin-right: 0; }
    .qblock img { height: auto; }
    ${section === 'oge' ? `
    /* Word shifts formula images down without reserving room in the next line. */
    .qblock span[style*="position:relative"]:has(> img.fipi-picture),
    .qblock span[style*="position: relative"]:has(> img.fipi-picture) {
      position: static !important; display: inline-block; vertical-align: middle; max-width: 100%;
    }
    .qblock span[style*="position"] > img.fipi-picture { display: block; }
    @media (max-width: 700px) {
      /* Matching tasks store label/content pairs in one six-column row. */
      .qblock .cell_0 table[cellpadding="3"]:has(> tbody > tr > td[width="0"]) {
        display: block; width: 100%; max-width: 100%;
      }
      .qblock .cell_0 table[cellpadding="3"]:has(> tbody > tr > td[width="0"]) > tbody { display: block; }
      .qblock .cell_0 table[cellpadding="3"]:has(> tbody > tr > td[width="0"]) > tbody > tr {
        display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 6px 4px;
      }
      .qblock .cell_0 table[cellpadding="3"]:has(> tbody > tr > td[width="0"]) > tbody > tr > td {
        width: auto !important; min-width: 0; text-align: left;
      }
      .qblock .cell_0 table[cellpadding="3"] td[width="0"] { white-space: nowrap; }
      .qblock .cell_0 table[cellpadding="3"] p { margin: 0; }
    }
    ` : ''}
    @media (max-width: 700px) {
      .qblock table.MsoNormalTable { display: block; max-width: 100%; overflow-x: auto; }
    }
    ` : ''}
    /* В исходных стилях ФИПИ для этого body задан overflow: hidden.
       Без переопределения длинные условия и опубликованные решения не прокручиваются на телефонах. */
    body.questions-container { width: 100%; max-width: 1000px; min-width: 0 !important; margin: 0 auto; padding: 24px; overflow-x: hidden; overflow-y: auto !important; background: #f4f6f8; }
    body.questions-container > table { background: white; box-shadow: 0 2px 14px #00000018; }
    .local-header { position: sticky; top: 0; z-index: 50; margin: -24px -24px 20px; padding: 14px 24px;
      background: #183153; color: white; font: 600 16px/1.35 Arial, sans-serif; box-shadow: 0 2px 8px #0003; }
    .local-header small { display: block; margin-top: 3px; font-weight: 400; opacity: .82; }
    .local-header h1 { margin: 0; color: #fff; font: inherit; white-space: normal !important; overflow-wrap: anywhere; }
    .seo-breadcrumbs { margin: 0 0 16px; color: #40566d; font: 14px/1.5 Arial, sans-serif; }
    .seo-breadcrumbs ol { display: flex; flex-wrap: wrap; gap: 6px 10px; margin: 0; padding: 0; list-style: none; }
    .seo-breadcrumbs li { min-width: 0; overflow-wrap: anywhere; }
    .seo-breadcrumbs li + li::before { content: '›'; margin-right: 10px; }
    .seo-breadcrumbs a { color: #1769aa; }
    .catalog-summary { margin: 0 0 20px; padding: 16px 18px; border: 1px solid #cbd7e4; border-radius: 8px; background: #fff; color: #344054; font: 16px/1.5 Arial, sans-serif; }
    .oge-shared-condition { margin-bottom: 16px; padding: 16px; border: 1px solid #cbd7e4; border-radius: 8px; background: white; }
    .oge-shared-condition h2 { margin: 0 0 12px; font: 700 18px Arial,sans-serif; color: #183153; }
    .fipi-table-scroll-hint { margin: 8px 0 !important; color: #40566d; font: 13px/1.4 Arial,sans-serif; }
    .fipi-table-scrollable:focus-visible { outline: 2px solid #1769aa; outline-offset: 2px; }
    .oge-topic-switcher { margin: 0 0 16px; }
    .oge-topic-switcher > summary { padding: 12px 16px; border: 1px solid #cbd7e4; border-radius: 8px; background: white; color: #1769aa; font-weight: 700; cursor: pointer; }
    .catalog-summary p { margin: 0; }
    .telegram-banner { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin: 0 0 20px; padding: 18px 20px;
      border: 1px solid #6f9cd0; border-radius: 10px; background: linear-gradient(120deg, #e7f3ff, #f6fbff); color: #183153;
      box-shadow: 0 2px 10px #18315312; font-family: Arial, sans-serif; }
    .telegram-banner-copy { display: grid; gap: 4px; }
    .telegram-banner-copy strong { font-size: 18px; line-height: 1.25; }
    .telegram-banner-copy span { color: #40566d; font-size: 14px; line-height: 1.4; }
    .telegram-banner a.telegram-banner-action { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; gap: 7px; min-height: 42px;
      padding: 10px 14px; border-radius: 7px; background: #229ed9; color: #fff; font: 700 14px/1.2 Arial, sans-serif; text-align: center; text-decoration: none; }
    .telegram-banner a.telegram-banner-action:hover { background: #168ac2; color: #fff; }
    .telegram-banner-action span { font-weight: 500; }
    .task-solution-jump { display: inline-flex; margin-top: 9px; padding: 7px 10px; border-radius: 6px; background: #e8f5e9;
      color: #1d5e2d; font: 700 14px Arial, sans-serif; text-decoration: none; }
    .task-solution-jump:hover { background: #d8f0db; color: #12451f; }
    .task-feedback-jump { display: inline-flex; margin: 9px 0 0 8px; padding: 7px 10px; border: 1px solid #f4d18a; border-radius: 6px; background: #fff5db;
      color: #704900; font: 700 14px Arial, sans-serif; text-decoration: none; }
    .task-feedback-jump:hover { background: #ffedbd; color: #563700; }
    .local-menu { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
    .local-menu-heading { grid-column: 2 / -1; align-self: center; margin-top: 2px; color: #d4dfeb; font: 700 13px Arial, sans-serif; }
    .local-menu a { padding: 7px 8px; border: 1px solid #ffffff70; border-radius: 6px; color: white; text-decoration: none;
      font-weight: 500; text-align: center; white-space: normal; }
    .local-menu a:hover { background: #ffffff18; }
    .local-menu a.active { background: white; color: #183153; }
    .physics-top-button { position: absolute; top: 12px; right: 24px; display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 9px 22px; border: 2px solid #f0b429; border-radius: 8px; background: #f0b429; color: #183153; font-size: 21px; font-weight: 800; line-height: 1; text-decoration: none; box-shadow: 0 3px 8px #0005; }
    .physics-top-button:hover { background: #ffd166; border-color: #ffd166; color: #183153; }
    .math-top-button { position: absolute; top: 12px; right: 24px; display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 9px 22px; border: 2px solid #f0b429; border-radius: 8px; background: #f0b429; color: #183153; font-size: 21px; font-weight: 800; line-height: 1; text-decoration: none; box-shadow: 0 3px 8px #0005; }
    .math-top-button:hover { background: #ffd166; border-color: #ffd166; }
    .local-menu form { margin: 0; min-width: 0; }
    .local-menu button { padding: 7px 11px; border: 1px solid #ffffff70; border-radius: 6px; color: white;
      background: transparent; font: 500 14px Arial, sans-serif; cursor: pointer; width: 100%; height: 100%; white-space: normal; }
    .local-menu button:hover { background: #ffffff18; }
    .math-topics { margin: 0 0 20px; padding: 20px; border: 1px solid #cbd7e4; border-radius: 10px;
      background: #fff; color: #243447; font-family: Arial, sans-serif; box-shadow: 0 2px 10px #18315312; }
    .math-topics-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 16px; }
    .math-topics-heading h2 { margin: 0; color: #183153; font-size: 23px; }
    .math-topics-heading p { margin: 5px 0 0; color: #526273; font-size: 14px; }
    a.math-all-link { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 7px; padding: 10px 13px; border: 1px solid #1769aa;
      border-radius: 7px; color: #1769aa; font-weight: 700; text-decoration: none; }
    .math-all-link span { display: inline-grid; min-width: 30px; place-items: center; padding: 2px 6px; border-radius: 12px; background: #e7f1fb; }
    a.math-all-link:hover, a.math-all-link.active { background: #1769aa; color: #fff; }
    .math-all-link:hover span, .math-all-link.active span { background: #ffffff2b; }
    .math-topic-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }
    .math-topic-group { overflow: hidden; border: 1px solid #d8e1eb; border-radius: 8px; background: #fbfdff; }
    .math-topic-group summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px;
      background: #eef4fa; color: #183153; font-weight: 700; cursor: pointer; }
    .math-topic-group summary > span:first-child { min-width: 0; white-space: normal; overflow-wrap: anywhere; }
    .math-topic-group summary:hover { background: #e3edf7; }
    .math-topic-group[open] summary { border-bottom: 1px solid #d8e1eb; }
    .math-topic-count { flex: 0 0 auto; color: #526273; font-weight: 600; }
    .math-topic-children { display: grid; gap: 4px; padding: 8px; }
    .math-topic-children a, .math-topic-children > span { display: block; padding: 8px 10px; border-radius: 6px; color: #1769aa;
      font-size: 14px; line-height: 1.35; text-decoration: none; }
    .math-topic-children a:hover { background: #eaf3fb; }
    .math-topic-children a.active { background: #1769aa; color: #fff; }
    .math-topic-children a.active .math-topic-count { color: inherit; }
    .math-topic-children .math-topic-major { margin-bottom: 3px; background: #eef4fa; color: #183153; font-weight: 700; }
    .math-topic-children .disabled { color: #8492a3; background: #f5f7f9; cursor: not-allowed; }
    .math-topic-children a .math-topic-count, .math-topic-children > span .math-topic-count { float: right; margin-left: 8px; }
    .math-topic-prompt { margin: 0 0 20px; padding: 18px 20px; border-left: 4px solid #f0b429; border-radius: 7px;
      background: #fff9e8; color: #40566d; font: 15px/1.5 Arial, sans-serif; }
    .math-topic-prompt strong { color: #183153; }
    .math-topic-picker { margin: 0 0 16px; border: 1px solid #cbd7e4; border-radius: 8px; background: #fff; }
    .math-topic-picker > summary { padding: 12px 16px; color: #1769aa; cursor: pointer; font: 700 15px/1.4 Arial, sans-serif; }
    .math-topic-picker > .math-topics { margin: 0; border: 0; box-shadow: none; }
    .catalogue-task-start { scroll-margin-top: 320px; }
    a.catalogue-task-jump { display: inline-flex; margin-top: 9px; padding: 7px 10px; border-radius: 6px;
      background: #e8f5e9; color: #1d5e2d; font: 700 14px Arial, sans-serif; text-decoration: none; }
    .physics-topics { margin: 0 0 20px; padding: 18px; border: 1px solid #cbd7e4; border-radius: 10px;
      background: #fff; color: #243447; font-family: Arial, sans-serif; box-shadow: 0 2px 10px #18315312; }
    .physics-topics-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 14px; }
    .physics-topics h2 { margin: 0; color: #183153; font-size: 23px; }
    .physics-topics-heading p { margin: 5px 0 0; color: #526273; font-size: 14px; }
    .physics-topics a { color: #1769aa; text-decoration: none; }
    .physics-topics a:hover { text-decoration: underline; }
    .physics-topics a.active { color: #fff; background: #1769aa; }
    a.physics-all-link { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 7px; padding: 10px 13px; border: 1px solid #1769aa; border-radius: 7px; font-weight: 700; }
    .physics-all-link span { display: inline-grid; min-width: 30px; place-items: center; padding: 2px 6px; border-radius: 12px; background: #e7f1fb; }
    a.physics-all-link:hover, a.physics-all-link.active { color: #fff; background: #1769aa; text-decoration: none; }
    .physics-all-link:hover span, .physics-all-link.active span { background: #ffffff2b; }
    .physics-topic-major, .physics-topic-children a, .physics-topic-children > span { display: block; padding: 8px 10px; border-radius: 6px; }
    .physics-topic-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .physics-topic-group { overflow: hidden; border: 1px solid #d8e1eb; border-radius: 8px; }
    .physics-topic-major { display: flex; justify-content: space-between; gap: 10px; font-weight: 700; background: #eef4fa; }
    .physics-topic-children { display: grid; gap: 2px; padding: 6px; }
    .physics-topic-children a .physics-topic-count, .physics-topic-children > span .physics-topic-count { float: right; margin-left: 8px; }
    .physics-topic-count { flex: 0 0 auto; color: #526273; font-weight: 600; }
    .physics-topics a.active .physics-topic-count { color: inherit; }
    .physics-topics .disabled { color: #8492a3; background: #f5f7f9; cursor: not-allowed; }
    a.physics-unclassified { display: flex; justify-content: space-between; gap: 10px; margin-top: 12px; padding: 10px 12px; border: 1px dashed #afbdcd; border-radius: 7px; }
    .physics-topic-prompt { margin: 0 0 20px; padding: 18px 20px; border-left: 4px solid #f0b429; border-radius: 7px;
      background: #fff9e8; color: #40566d; font: 15px/1.5 Arial, sans-serif; }
    .physics-topic-prompt strong { color: #183153; }
    .site-search-form { display: flex; align-items: stretch; gap: 7px; margin-top: 10px; font-family: Arial, sans-serif; }
    .site-search-form input { min-width: 0; flex: 1 1 230px; padding: 8px 10px; border: 1px solid #afbdcd; border-radius: 6px;
      color: #183153; background: #fff; font: 14px/1.2 Arial, sans-serif; }
    .site-search-form button { flex: 0 0 auto; padding: 8px 12px; border: 1px solid #ffffff70; border-radius: 6px;
      color: #fff; background: #254a79; font: 600 14px/1.2 Arial, sans-serif; cursor: pointer; }
    .site-search-form button:hover { background: #335d94; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    .task-permalink { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
    .task-permalink:hover { color: #0c4a6e; }
    .local-pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 7px;
      margin: 18px 0; padding: 12px; background: white; border-radius: 8px; box-shadow: 0 1px 7px #00000015;
      font: 14px Arial, sans-serif; }
    .local-pager--top { margin-top: 0; }
    .local-pager button { min-width: 38px; padding: 8px 11px; border: 1px solid #b8c3d1; border-radius: 6px;
      background: white; color: #183153; cursor: pointer; }
    .local-pager button:hover:not(:disabled) { background: #eaf1f8; }
    .local-pager button.active { border-color: #183153; background: #183153; color: white; }
    .local-pager button:disabled { cursor: default; opacity: .4; }
    .local-page-label { margin: 0 6px; color: #4b5968; }
    .task-sequence-pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 7px;
      margin: 0 0 18px; padding: 12px; background: white; border-radius: 8px; box-shadow: 0 1px 7px #00000015;
      font: 14px Arial, sans-serif; }
    .task-sequence-pager a, .task-sequence-pager span { min-height: 36px; box-sizing: border-box; display: inline-flex; align-items: center;
      justify-content: center; padding: 8px 11px; border: 1px solid #b8c3d1; border-radius: 6px; color: #183153; text-decoration: none; }
    .task-sequence-pager a:hover { background: #eaf1f8; }
    .task-sequence-pager .task-sequence-pager-label { border: 0; color: #4b5968; }
    .task-sequence-pager .task-sequence-pager-disabled { opacity: .4; }
    .search-page { margin: 0 0 24px; padding: 24px; border: 1px solid #d8e1eb; border-radius: 8px; background: #fff;
      box-shadow: 0 1px 7px #00000012; color: #243447; font: 16px/1.5 Arial, sans-serif; }
    .search-page h2 { margin: 0 0 14px; color: #183153; font-size: 24px; line-height: 1.25; }
    .search-page .site-search-form { margin: 0 0 14px; }
    .search-page .site-search-form input { border-color: #7f98b4; font-size: 16px; }
    .search-page .site-search-form button { border-color: #183153; background: #183153; }
    .search-page .site-search-form button:hover { background: #254a79; }
    .search-summary { margin: 0 0 14px; color: #4b5968; }
    .search-results { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
    .search-results a { display: grid; gap: 4px; padding: 14px 16px; border: 1px solid #cbd7e4; border-radius: 7px;
      color: #183153; text-decoration: none; background: #f8fafc; }
    .search-results a:hover { border-color: #7194ba; background: #eef4fa; }
    .search-results strong { font-size: 16px; }
    .search-results span { color: #40566d; font-size: 14px; }
    .local-task-hidden { display: none !important; }
    .solution-controls { margin-top: 16px; padding-top: 14px; border-top: 1px solid #d8e1eb; font-family: Arial, sans-serif; }
    .solution-controls.has-published-solution { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; border-color: #86ae8e; }
    .solution-published-badge { display: inline-flex; align-items: center; min-height: 34px; padding: 0 10px; border-radius: 17px;
      background: #e8f5e9; color: #1f6330; font: 700 13px Arial, sans-serif; }
    .solution-controls.has-published-solution .solution-discussion-link { margin-left: 0; }
    .solution-button { padding: 9px 14px; border: 1px solid #183153; border-radius: 6px; background: #183153; color: #fff;
      font: 600 14px Arial, sans-serif; cursor: pointer; }
    .solution-button:hover:not(:disabled) { background: #254a79; }
    .solution-button:disabled { cursor: wait; opacity: .7; }
    .solution-discussion-link { display: inline-flex; align-items: center; min-height: 38px; margin-left: 10px; color: #183153;
      font: 600 14px Arial, sans-serif; text-decoration: underline; text-underline-offset: 2px; }
    .solution-discussion-link:hover { color: #254a79; }
    .solution-feedback-link { display: inline-flex; align-items: center; min-height: 38px; margin-left: 2px; color: #704900;
      padding: 0; border: 0; background: transparent; font: 600 14px Arial, sans-serif; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
    .solution-feedback-link:hover { color: #563700; }
    .solution-result { margin-top: 12px; padding: 14px 16px; border-radius: 6px; background: #eef4fa; color: #243447; }
    .solution-result[hidden] { display: none; }
    .solution-result p { margin: 0 0 10px; }
    .solution-result p:last-child { margin-bottom: 0; }
    .solution-answer { font-weight: 700; }
    .solution-text { margin: 0; font: 16px/1.55 Arial, sans-serif; }
    .solution-text p, .formatted-solution p { margin: 0 0 12px; }
    .solution-text p:last-child, .formatted-solution p:last-child { margin-bottom: 0; }
    .math-fraction { display: inline-flex; flex-direction: column; min-width: 1.1em; margin: 0 .08em; vertical-align: middle;
      text-align: center; font: .93em/1.05 'Cambria Math', 'STIX Two Math', serif; }
    .math-fraction > span { display: block; padding: 0 .12em; }
    .math-fraction > span:first-child { border-bottom: 1px solid currentColor; }
    .math-root { display: inline-flex; align-items: flex-start; margin-right: .03em; vertical-align: middle;
      font-family: 'Cambria Math', 'STIX Two Math', serif; }
    .math-radicand { margin-top: .11em; padding: 0 .08em 0 .1em; border-top: 1px solid currentColor; line-height: .95; }
    .math-vector { position: relative; display: inline-block; padding-top: .13em; vertical-align: middle;
      font-family: 'Cambria Math', 'STIX Two Math', serif; }
    .math-vector::before { position: absolute; top: -.5em; left: 50%; content: '→'; transform: translateX(-50%); font-size: .85em; line-height: 1; }
    .solution-text sub, .solution-text sup, .formatted-solution sub, .formatted-solution sup { font-size: .75em; line-height: 0; }
    .solution-modal { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 24px;
      background: #10243c99; font-family: Arial, sans-serif; }
    .solution-modal[hidden] { display: none; }
    .solution-modal-dialog { display: flex; flex-direction: column; width: min(940px, 100%); max-height: calc(100dvh - 48px);
      overflow: hidden; border-radius: 10px; background: #eef4fa; color: #243447; box-shadow: 0 12px 40px #0008; }
    .solution-modal-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex: 0 0 auto;
      padding: 14px 18px; border-bottom: 1px solid #cbd7e4; background: #fff; }
    .solution-modal-title { margin: 0; color: #183153; font: 700 17px/1.35 Arial, sans-serif; }
    .solution-modal-close { min-width: 38px; min-height: 38px; border: 1px solid #183153; border-radius: 6px; background: #fff;
      color: #183153; font: 700 22px/1 Arial, sans-serif; cursor: pointer; }
    .solution-modal-close:hover { background: #eaf1f8; }
    .solution-modal-body { min-height: 0; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
      padding: 18px; scrollbar-gutter: stable; }
    .solution-modal-body p { margin: 0 0 10px; }
    .solution-modal-body p:last-child { margin-bottom: 0; }
    .solution-figure { margin: 16px 0 0; }
    .solution-diagram-caption { margin: 8px 0 0; color: #40566d; font: 14px/1.45 Arial, sans-serif; }
    .solution-diagram { display: block; width: min(100%, 560px); height: auto; max-height: none; margin-top: 12px; border: 1px solid #cbd7e4;
      border-radius: 4px; background: #fff; object-fit: contain; }
    .solution-comments { margin: 20px 0; padding: 20px; border: 1px solid #cbd7e4; border-radius: 8px; background: #fff;
      color: #243447; font-family: Arial, sans-serif; }
    .solution-comments h2 { margin: 0 0 14px; color: #183153; font-size: 21px; }
    .solution-comments-list { display: grid; gap: 12px; }
    .solution-comment { padding: 14px; border: 1px solid #d8e1eb; border-radius: 7px; background: #f8fafc; }
    .solution-comment header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
    .solution-comment header strong { color: #183153; }
    .solution-comment header span, .solution-comment time { color: #526273; font-size: 13px; }
    .solution-comment time { margin-left: auto; }
    .solution-comment p { margin: 8px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
    .solution-comment-delete-form { margin: 10px 0 0; }
    .solution-comment-delete-form button { padding: 7px 10px; border: 1px solid #8c241b; border-radius: 6px; background: #fff; color: #8c241b;
      font: 600 13px Arial, sans-serif; cursor: pointer; }
    .solution-comment-delete-form button:hover { background: #fbe9e8; }
    .solution-comments-empty, .solution-comments-login, .solution-comments-public { margin: 0; color: #526273; }
    .solution-comments-notice { margin: 0 0 12px; padding: 10px 12px; border-radius: 6px; background: #e9f2fb; color: #183153; }
    .solution-comment-form { margin-top: 18px; }
    .solution-comment-form label { display: block; margin-bottom: 6px; font-weight: 700; }
    .solution-comment-form textarea { display: block; width: 100%; min-height: 92px; padding: 10px 12px; border: 1px solid #afbdcd; border-radius: 6px;
      color: #243447; font: 16px/1.45 Arial, sans-serif; resize: vertical; }
    .solution-comment-form button { margin-top: 10px; padding: 9px 14px; border: 1px solid #183153; border-radius: 6px; background: #183153;
      color: #fff; font: 600 14px Arial, sans-serif; cursor: pointer; }
    .solution-comment-form button:hover:not(:disabled) { background: #254a79; }
    .solution-comment-form .comment-error { margin: 9px 0 0; color: #8c241b; }
    .site-feedback { margin: 20px 0; padding: 20px; border: 1px solid #bad4c0; border-radius: 8px; background: #f5fbf6;
      color: #243447; font-family: Arial, sans-serif; }
    .site-feedback h2 { margin: 0 0 10px; color: #183153; font-size: 21px; }
    .site-feedback > p { margin: 0 0 8px; }
    .site-feedback-private { color: #526273; font-size: 14px; }
    .site-feedback-notice, .site-feedback-error { margin: 12px 0 !important; padding: 10px 12px; border-radius: 6px; }
    .site-feedback-notice { background: #e8f5e9; color: #1d5e2d; }
    .site-feedback-error { background: #fbe9e8; color: #8c241b; }
    .site-feedback-form { margin-top: 16px; }
    .site-feedback-form label { display: block; margin: 12px 0 6px; font-weight: 700; }
    .site-feedback-form select, .site-feedback-form textarea { display: block; width: 100%; padding: 10px 12px; border: 1px solid #afbdcd; border-radius: 6px;
      color: #243447; background: #fff; font: 16px/1.45 Arial, sans-serif; }
    .site-feedback-form textarea { min-height: 100px; resize: vertical; }
    .site-feedback-form button { margin-top: 10px; padding: 9px 14px; border: 1px solid #183153; border-radius: 6px; background: #183153;
      color: #fff; font: 600 14px Arial, sans-serif; cursor: pointer; }
    .site-feedback-form button:hover { background: #254a79; }
    .seo-task-solution { margin: 20px 0; padding: 20px; border: 1px solid #cbd7e4; border-radius: 8px; background: #eef4fa;
      color: #243447; font-family: Arial, sans-serif; }
    .seo-task-solution h2 { margin: 0 0 12px; color: #183153; font-size: 21px; }
    .seo-task-solution p { margin: 0 0 12px; }
    .seo-task-solution .formatted-solution { margin: 0; font: 16px/1.55 Arial, sans-serif; }
    .seo-task-solution figure { margin: 16px 0 0; }
    .seo-task-solution figcaption { margin-top: 8px; color: #40566d; font-size: 14px; }
    .seo-task-solution img { display: block; width: min(100%, 560px); height: auto; border: 1px solid #cbd7e4; border-radius: 4px; background: #fff; }
    @media (max-width: 700px) {
      body.questions-container { padding: 12px; overflow-x: hidden; }
      .local-header { position: static; margin: -12px -12px 14px; padding: 14px 12px; font-size: 15px; }
      .catalogue-task-start { scroll-margin-top: 12px; }
      .math-topics, .telegram-banner, .local-pager { max-width: 100%; }
      .physics-top-button { position: static; margin: 0 0 10px auto; min-height: 42px; padding: 8px 18px; font-size: 19px; }
      .math-top-button { position: static; margin: 0 0 10px auto; min-height: 42px; padding: 8px 18px; font-size: 19px; }
      .local-header small { font-size: 12px; line-height: 1.35; }
      .telegram-banner { align-items: stretch; flex-direction: column; gap: 12px; margin-bottom: 14px; padding: 16px; }
      .telegram-banner-copy strong { font-size: 16px; }
      .telegram-banner-action { width: 100%; }
      .local-menu { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 12px; }
      .local-menu a, .local-menu button { display: grid; place-items: center; min-height: 46px; padding: 6px 4px;
        font-size: 12px; line-height: 1.2; overflow-wrap: anywhere; }
      .physics-topics { padding: 14px 12px; }
      .physics-topics-heading { align-items: flex-start; flex-direction: column; }
      .physics-all-link { width: 100%; justify-content: center; }
      .physics-topic-grid { grid-template-columns: 1fr; }
      .math-topics { padding: 15px 12px; }
      .math-topics-heading { flex-direction: column; }
      .math-topics-heading h2, .math-topics-heading p { white-space: normal; overflow-wrap: anywhere; }
      .math-all-link { width: 100%; justify-content: center; }
      .math-topic-grid { grid-template-columns: 1fr; }
      .qblock { margin-top: 8px; padding: 14px 16px; }
      .qblock, .qblock p, .qblock .hint { font-size: 17px; line-height: 1.48; text-align: left; }
      .qblock > form table[align="right"] { float: none; margin: 12px auto; max-width: 100%; }

      .task-header-panel { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 8px; align-items: center; padding: 9px 8px; }
      .task-header-panel .id-text { min-width: 0; margin: 0; font-size: 15px; }
      .task-header-panel .favorite-button { display: none; }
      .task-header-panel .answer-panel { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
      .task-header-panel .task-status { min-width: 0; font-size: 14px; }
      .task-header-panel .answer-button { float: none; flex: 0 0 auto; width: auto; height: 36px; margin: 0; padding: 8px 10px; font-size: 12px; }
      .task-header-panel .task-info-panel { left: 8px; right: 8px; bottom: auto; top: 48px; max-width: none; }
      .task-info-panel .task-info-content { padding: 10px 12px; overflow-x: auto; }
      .local-pager { gap: 6px; margin: 14px 0; padding: 10px 8px; }
      .local-pager button { min-width: 36px; padding: 8px 9px; font-size: 13px; }
      .local-page-label { flex: 1 0 100%; margin: 2px 0 0; text-align: center; font-size: 12px; }
      .site-search-form input { flex-basis: 0; }
      .search-page { margin-bottom: 16px; padding: 18px 14px; }
      .search-page h2 { font-size: 21px; }
      .solution-controls { margin-top: 14px; }
      .solution-controls.has-published-solution { gap: 7px; }
      .solution-published-badge { min-height: 32px; font-size: 12px; }
      .solution-button { min-height: 38px; font-size: 14px; }
      .solution-discussion-link { margin-left: 8px; font-size: 13px; }
      .solution-result { padding: 12px; }
      .solution-text { font-size: 15px; }
      /* На iOS прокрутка вложенного блока внутри fixed-диалога может не принимать жесты.
         Поэтому на телефоне прокручивается само полноэкранное окно решения. */
      .solution-modal { display: block; padding: 0; overflow-y: auto; overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch; touch-action: pan-y; }
      .solution-modal-dialog { display: block; width: 100%; min-height: 100%; height: auto; max-height: none; border-radius: 0; }
      .solution-modal-header { position: sticky; top: 0; z-index: 1; padding: 12px; }
      .solution-modal-title { font-size: 16px; }
      .solution-modal-body { min-height: calc(100dvh - 63px); overflow: visible; padding: 14px 12px 24px; }
    }
    @media print { .local-header { position: static; margin: 0 0 16px; } body.questions-container { background: white; padding: 0; } }
  `;
};
