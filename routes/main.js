const express = require('express');
const router = express.Router();
const db = require('./maria');
const fs = require('fs');
const DB_BLOG_BOARD = 'BLOG_BOARD';
const DB_USERINFO = 'ADMIN_INFO';
var passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt-nodejs');


//파일 업로드 
const multer = require('multer');
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    //파일이미지 파일만 업로드 .
    if (file.mimetype == "image/jpeg" || file.mimetype == "image/jpg" || file.mimetype == "image/png") {
      cb(null, 'public/resources/uploadImages')
    } else {
      console.log("Only Image file")
      return;
    }
  },
  //파일이름 설정
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname)
  }
});

var upload = multer({
  storage: storage
})


/**
 * 글 목록 페이지
 */
router.get('/', function (req, res, next) {
  db.query('SELECT * FROM ' + DB_BLOG_BOARD, function (err, list, fields) {
    if (!err) {
      res.render('main', {
        title: 'Board List',
        list: list
      });
    } else {
      console.log("err : " + err);
      res.send(err);
    }
  });
});


/**
 * 글 읽기 페이지
 */
router.get('/view/:CONT_ID', function (req, res, next) {
  var cont_id = req.params.CONT_ID;
  var id = req.user;
  db.query('SELECT CONT_ID, TITLE, REG_ID, CONTENT, DATE_FORMAT(REG_DT, "%Y/%m/%d %T") as REG_DT, FILE_PATH FROM ' + DB_BLOG_BOARD + ' WHERE CONT_ID = ?', [cont_id], function (err, rows) {
    if (err) {
      console.log(err);
      db.rollback(function () {
        console.log("rollback error");
      })
    } else {
      db.commit(function (err) {
        if (err) {
          console.log("commit error : " + err);
        }
        res.render('view', {
          title: 'VIEW PAGE',
          rows: rows,
          id
        })
      })
    }
  })
});


/**
 * 이미지 불러오기
 */
router.get('/imgs/:CONT_ID', function (req, res) {
  var cont_id = req.params.CONT_ID;
  console.log(cont_id);
  db.query('SELECT CONT_ID, TITLE, REG_ID, CONTENT, DATE_FORMAT(REG_DT, "%Y/%m/%d %T") as REG_DT, FILE_PATH FROM ' + DB_BLOG_BOARD + ' WHERE CONT_ID = ?', [cont_id], function (err, rows) {
    if (err) {
      db.rollback(function () {
        console.log("rollback error");
      });
    } else {
      db.commit(function (err) {
        if (err) {
          console.log("commit error" + err);
        }
        if (rows.length <= 1) {
          fs.readFile(rows[0].FILE_PATH, function (err, data) {
            if (err) throw err;
            res.writeHead(200, {
              'Content-Type': 'image/png'
            });
            res.end(data);
          });
        } else {
          console.log("length of rows is not 1");
        }
      });
    }
  });
});

/**
 * 글 쓰기 페이지
 */
router.get('/write', function (req, res, next) {
  res.render('write', {
    title: "쓰기 페이지"
  });
});

/**
 * 글 쓰기 페이지
 */
router.post('/write', upload.single('image'), function (req, res, next) {
  var originalname = "";
  var filename = "";
  var filepath = "";

  var body = req.body;
  if (req.file) {
    originalname = req.file.originalname;
    filename = req.file.filename;
    filepath = req.file.path;
  }
  var writer = 'admin';
  var title = body.title;
  var content = body.content;


  db.beginTransaction(function (err) {
    if (err) console.log(err);
    db.query('INSERT INTO ' + DB_BLOG_BOARD + '(TITLE, REG_ID, CONTENT, ORG_FILE_NAME, SAVE_FILE_NAME, FILE_PATH) VALUES(?,?,?,?,?,?)', [title, writer, content, originalname, filename, filepath], function (err) {
      if (err) {
        /* 이 쿼리문에서 에러가 발생했을때는 쿼리문의 수행을 취소하고 롤백합니다.*/
        console.log(err);
        db.rollback(function () {
          console.error('rollback error1');
        })
      }
      db.query('SELECT LAST_INSERT_ID() as CONT_ID', function (err, rows) {
        if (err) {
          /* 이 쿼리문에서 에러가 발생했을때는 쿼리문의 수행을 취소하고 롤백합니다.*/
          console.log(err);
          db.rollback(function () {
            console.error('rollback error1');
          })
        } else {
          db.commit(function (err) {
            if (err) console.log(err);
            var idx = rows[0].CONT_ID;
            res.redirect('/main');
          });
        }
      });
    });
  });
});

/**
 * 글 수정 페이지
 */
router.get('/modify/:CONT_ID', function (req, res, next) {
  var cont_id = req.params.CONT_ID;
  db.query('SELECT CONT_ID, TITLE, REG_ID, CONTENT, DATE_FORMAT(REG_DT, "%Y/%m/%d %T") as REG_DT, ORG_FILE_NAME FROM ' + DB_BLOG_BOARD + ' WHERE CONT_ID = ?', [cont_id], function (err, rows) {
    if (err) {
      console.log(err);
      db.rollback(function () {
        console.log("rollback error");
      })
    } else {
      db.commit(function (err) {
        if (err) {
          console.log("commit error : " + err);
        }
        console.log(rows);
        res.render('modify', {
          title: '수정 페이지',
          rows: rows
        })
      })
    }
  })
});

router.post('/modify/:CONT_ID', upload.single('image'), function (req, res, next) {
  var cont_id = req.params.CONT_ID;
  var title = req.body.title;
  var content = req.body.content;

  var originalname = "";
  var filename = "";
  var filepath = "";

  if (req.file) {
    originalname = req.file.originalname;
    filename = req.file.filename;
    filepath = req.file.path;
  }
  console.log(req.file);

  //파일변경까지 있는 경우
  if (req.file) {
    db.query('UPDATE ' + DB_BLOG_BOARD + ' SET TITLE=?, CONTENT=?, ORG_FILE_NAME=?, SAVE_FILE_NAME=?, FILE_PATH=? WHERE CONT_ID=?', [title, content, originalname, filename, filepath, cont_id], function (err, rows, fields) {
      if (err) {
        console.log(err);
        db.rollback(function () {
          console.log("rollback error");
        })
      } else {
        db.commit(function (err) {
          if (err) {
            console.log("commit error : " + err);
          }
          res.redirect('/main');
        })
      }
    })
  } else {
    //파일변경이 없는경우
    db.query('UPDATE ' + DB_BLOG_BOARD + ' SET TITLE=?, CONTENT=? WHERE CONT_ID=?', [title, content, cont_id], function (err, rows, fields) {
      if (err) {
        console.log(err);
        db.rollback(function () {
          console.log("rollback error");
        })
      } else {
        db.commit(function (err) {
          if (err) {
            console.log("commit error : " + err);
          }
          res.redirect('/main');
        })
      }
    })
  }

});

/**
 * 글 삭제 페이지
 */
router.post('/delete/:CONT_ID', function (req, res, next) {
  var cont_id = req.params.CONT_ID;

  db.query('DELETE FROM ' + DB_BLOG_BOARD + ' WHERE CONT_ID = ?', [cont_id], function (err, rows, fields) {
    if (err) {
      console.log(err);
      db.rollback(function () {
        console.log("rollback error");
      })
    } else {
      db.commit(function (err) {
        if (err) {
          console.log("commit error : " + err);
        }
        res.redirect('/main');
      })
    }
  })
});


/**
 * @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * 로그인
 * @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */

router.get('/login', function (req, res) {

  if (req.user !== undefined) {
    res.redirect('/main')
  } else {
    res.render('login', {
      title: 'login'
    })
  }
});


router.post('/login', passport.authenticate('local', {
    failureRedirect: '/main/login',
    failureFlash: true
  }), // 인증 실패 시 401 리턴, {} -> 인증 스트레티지
  function (req, res) {
    res.redirect('/main');
  });

passport.use(new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true //인증을 수행하는 인증 함수로 HTTP request를 그대로  전달할지 여부를 결정한다
}, function (req, username, password, done) {
  console.log('username : ' + username);
  db.query('SELECT ADMIN_ID, ADMIN_PASSWORD FROM ' + DB_USERINFO + ' WHERE ADMIN_ID = ?', [username], function (err, rows) {
    if (err) {
      db.rollback(function () {
        console.log("rollback error");
        return done(false, null);
      });
    } else {
      db.commit(function (err) {
        if (err) {
          console.log("commit error" + err);
          return done(false, null);
        }
        if (rows.length <= 1) {
          bcrypt.compare(password, rows[0].ADMIN_PASSWORD, function (err, res) {
            console.log('password : ' + password);
            if (res) {
              return done(null, {
                'user_id': username,
              });
            } else {
              return done(null, false, {
                'message': 'Your password is incorrect'
              });
            }
          });
        } else {
          return done(false, null);
        }
      });
    }
  });
}));


passport.serializeUser(function (user, done) {
  done(null, user)
});


passport.deserializeUser(function (user, done) {
  done(null, user);
});


var isAuthenticated = function (req, res, next) {
  if (req.isAuthenticated())
    return next();
  res.redirect('/login');
};


router.get('/myinfo', isAuthenticated, function (req, res) {
  res.render('myinfo', {
    title: 'My Info',
    user_info: req.user
  })
});


router.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/main');
});


module.exports = router;
