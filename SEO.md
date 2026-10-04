# Индексация и сопровождение SEO

Публичный адрес: https://maksimas-win.github.io/bukiskis-parama/

## Что формирует сборка

- Шесть доступных без JavaScript информационных страниц с `index,follow,max-image-preview:large`.
- Локализованные title, description, OpenGraph и Twitter summary.
- Canonical на `/ru/index.html`, `/lt/index.html`, `/en/index.html`, `/pl/index.html`, `/de/index.html`, `/uk/index.html`. Корневая страница — копия русской с тем же canonical, поэтому повторно в sitemap не включается.
- Взаимные hreflang для шести языков и x-default. Для страниц конфиденциальности ссылки указывают на их переводы.
- WebPage microdata на существующем HTML без inline-скриптов и ослабления CSP. Эта разметка описывает страницу и не обещает расширенный результат поиска.
- `sitemap.xml` только с шестью каноническими индексируемыми страницами. Страницы конфиденциальности, 404 и файл подтверждения владения исключены.
- Файл подтверждения Google из `searchConsoleVerificationFile`: `googled8db1e57cec5f564.html`. Он создаётся при каждой сборке; удалять его после подтверждения не следует.

`publicBaseUrl` хранит постоянный адрес; `SITE_URL` может переопределить его при сборке. При смене домена нужно обновить конфигурацию и workflow. `contentUpdated` — дата содержательного изменения индексируемых страниц, используемая в sitemap; не обновлять автоматически при каждой сборке. `reviewed` — отдельная дата проверки источников.

Индексация справочного материала не меняет `recipientVerified` и `gpmBankAccountVerified`. Предупреждения о статусе получателя остаются на странице.

## Google Search Console

1. Выбрать ресурс с префиксом URL `https://maksimas-win.github.io/bukiskis-parama/`.
2. Подтвердить владение методом HTML-файла. Точный адрес: https://maksimas-win.github.io/bukiskis-parama/googled8db1e57cec5f564.html
3. В разделе Sitemaps отправить `https://maksimas-win.github.io/bukiskis-parama/sitemap.xml`.
4. Проверить канонические URL через «Проверка URL». После проверки опубликованной страницы можно запросить индексирование.
5. Следить за отчётами индексирования и эффективности. Успешная отправка sitemap или запроса не гарантирует включения в индекс либо позиции.

## Особенность GitHub Pages

Поисковые роботы читают robots.txt в корне хоста: `https://maksimas-win.github.io/robots.txt`, а не в папке проекта. На момент настройки корневой URL возвращал HTTP 404, то есть запрета обхода с его стороны нет. Файл в `bukiskis-parama/robots.txt` пригодится при размещении сайта в корне отдельного домена, но не заменяет отправку sitemap в Search Console на текущем хостинге. Соседние репозитории для этого не менялись.

## Bing и внешние ссылки

Для Bing Webmaster Tools можно импортировать подтверждённый ресурс из Search Console либо выполнить отдельную проверку и отправить тот же sitemap. Подтверждение Google не означает автоматического подключения Bing.

Обычная ссылка на этот гид с основного сайта прихода поможет посетителям и поисковым роботам находить его. Изменения основного сайта выполняются отдельной задачей.

## Проверка изменений

Запустить `npm run build` и `npm test`. После публикации проверить HTTP 200, отсутствие заголовка X-Robots-Tag: noindex, метатеги всех шести страниц, sitemap и точное содержимое файла Google. Не считать зелёную сборку доказательством индексирования.

Документация: [Search Console](https://developers.google.com/search/docs/monitor-debug/search-console-start), [sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt).
