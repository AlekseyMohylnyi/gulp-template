var path = {
    build: {
        html: "dist/",
        js: "dist/js/",
        css: "dist/css/",        
        images: "dist/img/",
        fonts: "dist/fonts/"
    },
    src: {
        html: ["src/*.html", "!" + "src/_*.html"],
        js: "src/js/*.js",
        css: "src/css/style.css",
        scss: "src/scss/main.scss",
        images: "src/img/**/*.{jpg,png,svg,gif,ico,jpeg}",
        fonts: "src/fonts/**/*.{eot,ttf,otf,otc,ttc,woff,woff2,svg}"
    },
    watch: {
        html: "src/**/*.html",
        js: "src/js/**/*.js",
        css: "src/css/**/*.css",
        scss: "src/scss/**/*.scss",
        images: "src/img/**/*.{jpg,png,svg,gif,ico,webp,jpeg}",
        fonts: "src/fonts/**/*.{eot,ttf,otf,otc,ttc,woff,woff2,svg}"
    },
    clean: "./dist"
}

const isProd = process.argv.includes("--production");
const isDev = !isProd;

const { src, dest, watch, series, parallel } = require("gulp");
const browserSync = require("browser-sync").create();
const del = require("del");

const plumber = require("gulp-plumber");
const notify = require("gulp-notify");
const fileInclude = require("gulp-file-include");
const htmlmin = require("gulp-htmlmin");
const size = require("gulp-size");
const concat = require("gulp-concat");
const cssimport = require("gulp-cssimport");
const autoprefixer = require("gulp-autoprefixer");
const csso = require("gulp-csso");
const rename = require("gulp-rename");
const shorthand = require("gulp-shorthand");
const groupCssMediaQueries = require("gulp-group-css-media-queries");
const sass = require("gulp-sass")(require("sass"));
const babel = require("gulp-babel");
const webpack = require("webpack-stream");
const imagemin = require("gulp-imagemin");
const newer = require("gulp-newer");
const webp = require("gulp-webp");
const webpHtml = require("gulp-webp-html");
const webpCss = require("gulp-webp-css");
const fonter = require("gulp-fonter");
const ttf2woff2 = require("gulp-ttf2woff2");
const gulpIf = require("gulp-if");

const server = () => {
    browserSync.init({
        notify: false,
        server: {
            baseDir: "./dist"
        }
    })
}

const html = () => {
    return src(path.src.html)
    .pipe(plumber({
        errorHendler: notify.onError(error => ({
            title: "HTML",
            message: error.message
        }))
    }))    
    .pipe(fileInclude())
    .pipe(webpHtml())
    .pipe(size({title: "до"}))
    .pipe(htmlmin({
        collapseWhitespace: isProd
    }))
    .pipe(size({title: "после"}))
    .pipe(dest(path.build.html));    
}

const css = () => {
    return src(path.src.css, { sourcemaps: isDev })
    .pipe(plumber({
        errorHendler: notify.onError(error => ({
            title: "CSS",
            message: error.message
        }))
    }))    // поиск ошибок
    .pipe(concat("style.css")) // объединение файлов в один
    .pipe(cssimport()) // чтоб работал импорт
    .pipe(gulpIf(isProd, webpCss()))
    .pipe(autoprefixer()) // расстановка префиксов, browserslist находится в package.json
    .pipe(shorthand()) // применяет к стилям сокращённый вариант написания
    .pipe(groupCssMediaQueries()) // объединяет медиазапросы
    .pipe(dest(path.build.css, { sourcemaps: isDev }))
    .pipe(rename({ suffix: ".min" }))
    .pipe(csso())
    .pipe(dest(path.build.css, { sourcemaps: isDev }));
}

const js = () => {
    return src(path.src.js, { sourcemaps: isDev })
    .pipe(plumber({
        errorHendler: notify.onError(error => ({
            title: "JavaScript",
            message: error.message
        }))
    }))   
    .pipe(babel()) //пресеты для babel в файле package.json
    .pipe(webpack({
        mode: isProd ? "development" : "production" //чтоб сжать js заменить на "production"
    }))    
    .pipe(dest(path.build.js, { sourcemaps: isDev }));
}

const scss = () => {
    return src(path.src.scss, { sourcemaps: isDev })
    .pipe(plumber({
        errorHendler: notify.onError(error => ({
            title: "SCSS",
            message: error.message
        }))
    }))    
    .pipe(sass())
    .pipe(webpCss())
    .pipe(autoprefixer()) 
    .pipe(shorthand()) 
    .pipe(groupCssMediaQueries())
    .pipe(rename({ basename: "style" }))
    .pipe(dest(path.build.css, { sourcemaps: isDev }))
    .pipe(rename({ suffix: ".min", basename: "style" }))
    .pipe(csso())    
    .pipe(dest(path.build.css, { sourcemaps: isDev }));
}

const img = () => {
    return src(path.src.images)
    .pipe(plumber({
        errorHendler: notify.onError(error => ({
            title: "Images",
            message: error.message
        }))
    }))
    .pipe(newer(path.build.images))
    .pipe(webp())
    .pipe(dest(path.build.images))
    .pipe(src(path.src.images))
    .pipe(newer(path.build.images))
    .pipe(gulpIf(isProd, imagemin())) // не работает, надо обновить nodejs, должно помочь
    .pipe(dest(path.build.images));
}

const fonts = () => {
    return src(path.src.fonts)
    .pipe(plumber({
        errorHendler: notify.onError(error => ({
            title: "Fonts",
            message: error.message
        }))
    }))
    .pipe(newer(path.build.fonts))
    .pipe(fonter({
        formats: ["ttf", "woff", "eot", "svg"]
    }))
    .pipe(dest(path.build.fonts))
    .pipe(ttf2woff2())
    .pipe(dest(path.build.fonts));
}

const watcher = () => {
    watch(path.watch.html, html).on("all", browserSync.reload)
    watch(path.watch.css, css).on("all", browserSync.reload)
    // watch(path.watch.scss, scss).on("all", browserSync.reload)
    watch(path.watch.js, js).on("all", browserSync.reload)
    watch(path.watch.images, img).on("all", browserSync.reload)
    watch(path.watch.fonts, fonts).on("all", browserSync.reload)
}

const clear = () => {
    return del(path.clean);
}

const build = series(
    clear,
    parallel(html, css, js, img, fonts)
)

const dev = series(
    build,
    parallel(watcher, server)
)

exports.html = html;
exports.css = css;
// exports.scss = scss;
exports.js = js;
exports.img = img;
exports.fonts = fonts;
exports.watch = watcher;
exports.clear = clear;

exports.dev = dev;
exports.build = build;

exports.default = isProd ? build : dev;