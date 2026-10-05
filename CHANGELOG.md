# 0.5.4 — 2026-10-05

- Visual polish on the existing layout: reading progress bar and header elevation, accent lines on section labels, animated navigation underline, button and copy-button feedback, card hover lift.
- Fix the scroll reveal so blocks actually fade in, and extend it to the remaining sections with a short stagger for cards.
- FAQ: drawn chevron that turns on open, smooth opening where supported; footer links aligned on one baseline.
- Hero figure sheen, calculator background light and focus state; step panels fade in when switching.
- All effects respect reduced motion, forced colours and print; content stays readable without JavaScript.

# 0.5.3 — 2026-10-05

- Automatically show the parish appeal once per tab session; retain manual reopening, keyboard closing and focus restoration.
- Show the cookie notice after the welcome dialog closes and explain the local session flag in all six languages.
- Check first entry, reload, language navigation and unavailable browser storage in browser regression tests.

# 0.5.2 — 2026-10-04

- Show the owner-supplied parish appeal in the first support dialog, with the complete image, a full-size link and readable text in six languages. Load the image only when that dialog opens.

# 0.5.1 — 2026-10-04

- Restore legacy asset URLs for cached pages after the asset migration.
- Make project previews clickable, add visible details buttons, keep support text visible and reset photo hotspots on reopen.
- Add a localized privacy notice with local acknowledgement and a footer reopen control.

# Changelog

## 0.5.0 — 2026-10-04

- Исправлены ответы помощника о нескольких годах и сохранение текущего раздела при смене языка.
- Сохранён существующий дизайн; страница 404 получила оформление сайта и понятные ссылки возврата.
- Публикуемые стили, скрипты, изображения и шрифты разделены по папкам assets.
- Единая публикация через GitHub Actions после сборки, регрессионных и браузерных проверок; pull request проверяется без публикации.
- Добавлена автоматическая сверка всех опубликованных файлов с протестированным выпуском.
- Актуализированы README и краткая инструкция; сохранены SEO и подтверждение Google.

## Обновления 0.4 — 2026-10-04

- Добавлен заключительный блок поддержки храма на шести языках.
- Включена индексация информационного гида; обновлены SEO-метаданные, sitemap и hreflang.
- Добавлен воспроизводимый HTML-файл подтверждения Google Search Console.

## 0.3–0.4 — 2026-10-03

- Добавлены необязательное 3D-вступление со статическими вариантами и локальный помощник по материалам гида.

## 0.2.0 — 2026-09-29

- Переработан в нейтральный информационный гид о GPM.
- Удалены кресты, церковный логотип, силуэт храма и фотография храма, включая favicon и метаданные.
- Новый первый экран: типографика, процент и интерактивные пояснения вместо церковной иллюстрации.
- Нейтральная светлая сине-графитовая палитра, современный шрифт без засечек.
- Основная навигация и мобильные кнопки ведут к инструкции и видео.
- Справочная часть полностью предшествует отдельному добровольному разделу помощи храму.
- Обновлены все шесть языковых версий. В инструкции код прихода показан как пример выбранного получателя.
- Чистая пересборка docs исключает сохранение удалённых файлов от старой версии.
- Налоговые периоды, источники, реквизиты и флаги неподтверждённости не менялись.

## 0.1.0 — 2026-09-29

Первая сборка: шесть языков, инструкция FR0512, калькулятор, видеоблок и раздел поддержки.
