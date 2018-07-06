/* jshint node:true */
"use strict";

const gulp = require("gulp");
const $ = require("gulp-load-plugins")();
const pump = require('pump');

gulp.task("styles", () => {
  //$.util.log(util.colors.cyan('Recompiling sass files'));
  return gulp
    .src("app/styles/main.scss")
    .pipe($.plumber())
    .pipe(
      $.rubySass({
        style: "expanded",
        precision: 10
      })
    )
    .pipe(
      $.autoprefixer({
        browsers: ["last 1 version"]
      })
    )
    .pipe(gulp.dest("app/styles"));
});

gulp.task("jshint", () => {
  return gulp
    .src("app/scripts/**/*.js")
    .pipe($.jshint())
    .pipe($.jshint.reporter("jshint-stylish"))
    .pipe($.jshint.reporter("fail"));
});


gulp.task('html', function () {
  var lazypipe = require("lazypipe");
  var cssChannel = lazypipe()
    .pipe($.csso)
    .pipe(
      $.replace,
      "bower_components/bootstrap-sass-official/assets/fonts/bootstrap",
      "fonts"
    );
  var assets = $.useref.assets({
    searchPath: "{.tmp,app}"
  });

  return gulp.src('app/*.html')
    .pipe(assets)
    .pipe($.if("*.css", cssChannel()))
    .pipe(assets.restore())
    .pipe($.useref())
    .pipe($.htmlmin({ collapseWhitespace: true }))
    .pipe(gulp.dest('dist'));
});

gulp.task("images", () => {
  return gulp
    .src("app/img/**/*")
    .pipe(
      $.cache(
        $.imagemin({
          progressive: true,
          interlaced: true
        })
      )
    )
    .pipe(gulp.dest("dist/img"));
});

gulp.task("fonts", () => {
  return gulp
    .src(require("main-bower-files")().concat("app/fonts/**/*"))
    .pipe($.filter("**/*.{eot,svg,ttf,woff}"))
    .pipe($.flatten())
    .pipe(gulp.dest("dist/fonts"));
});

gulp.task("extras", () => {
  return gulp
    .src(
      [
        "app/*.*",
        "!app/*.html",
        "node_modules/apache-server-configs/dist/.htaccess"
      ],
      {
        dot: true
      }
    )
    .pipe(gulp.dest("dist"));
});

gulp.task("clean", require("del").bind(null, [".tmp", "dist"]));

gulp.task("connect", ["styles"], () => {
  var serveStatic = require("serve-static");
  var serveIndex = require("serve-index");
  var app = require("connect")()
    .use(
      require("connect-livereload")({
        port: 35729
      })
    )
    .use(serveStatic(".tmp"))
    .use(serveStatic("app"))
    // paths to bower_components should be relative to the current file
    // e.g. in app/index.html you should use ../bower_components
    .use("/bower_components", serveStatic("bower_components"))
    .use(serveIndex("app"));

  require("http")
    .createServer(app)
    .listen(9000)
    .on("listening", () => {
      console.log("Started connect web server on http://localhost:9000");
    });
});

gulp.task('compress', () => {
  pump([
    gulp.src('app/**/*.js'),
    $.uglify(),
    gulp.dest('dist')
  ]);
});

gulp.task("serve", ["connect", "watch"], () => {
  require("opn")("http://localhost:9000");
});

// inject bower components
gulp.task("wiredep", () => {
  var wiredep = require("wiredep").stream;

  gulp
    .src("app/styles/*.scss")
    .pipe(wiredep())
    .pipe(gulp.dest("app/styles"));

  gulp
    .src("app/*.html")
    .pipe(
      wiredep({
        exclude: ["bootstrap-sass-official"]
      })
    )
    .pipe(gulp.dest("app"));
});

// watch for changes
gulp.task("watch", ["connect"], () => {
  $.livereload.listen();
  gulp
    .watch([
      "app/*.html",
      "app/styles/**/*.css",
      "app/scripts/**/*.js",
      "app/img/**/*",
      "app/styles/**/*.scss"
    ])
    .on("change", $.livereload.changed);
  gulp.watch("app/styles/*.scss", ["styles"]);
  gulp.watch("bower.json", ["wiredep"]);
});

gulp.task(
  "build",
  ["jshint", "minify", "compress", "images", "extras", "styles"],
  () => {
    //add a task to update the dist folder with CNAME to simplify the publish process
    return gulp
      .src("dist/**/*")
      .pipe(gulp.dest("./docs"))
      .pipe(
        $.size({
          title: "build",
          gzip: true
        })
      );
  }
);

gulp.task("default", ["clean"], () => {
  gulp.start("build");
});
