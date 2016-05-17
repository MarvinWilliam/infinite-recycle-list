/*jshint globalstrict: true*/
/*global require*/

'use strict';

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gulp.task('build', function() {
    return gulp.src(['src/infinite-recycle-list.js'])
        .pipe(gulp.dest('./dist'))
        .pipe(uglify())
        .pipe(rename('infinite-recycle-list.min.js'))
        .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['build']);