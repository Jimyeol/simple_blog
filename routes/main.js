const express = require('express');
const router = express.Router();
const db = require('./maria');
const DB_NAME = 'BLOG_BOARD';

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
  db.query('SELECT * FROM ' + DB_NAME, function (err, list, fields) {
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
  db.query('SELECT CONT_ID, TITLE, REG_ID, CONTENT, DATE_FORMAT(REG_DT, "%Y/%m/%d %T") as REG_DT FROM ' + DB_NAME + ' WHERE CONT_ID = ?', [cont_id], function (err, rows) {
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
        res.render('view', {
          title: 'VIEW PAGE',
          rows: rows
        })
      })
    }
  })
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

  var body = req.body;
  var originalname = req.file.originalname;
  var filename = req.file.filename;
  var filepath = req.file.path;
  var writer = 'admin';
  var title = body.title;
  var content = body.content;


  db.beginTransaction(function (err) {
    if (err) console.log(err);
    db.query('insert into ' + DB_NAME + '(TITLE, REG_ID, CONTENT, ORG_FILE_NAME, SAVE_FILE_NAME, FILE_PATH) values(?,?,?,?,?,?)', [title, writer, content, originalname, filename, filepath], function (err) {
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
  db.query('SELECT CONT_ID, TITLE, REG_ID, CONTENT, DATE_FORMAT(REG_DT, "%Y/%m/%d %T") as REG_DT FROM ' + DB_NAME + ' WHERE CONT_ID = ?', [cont_id], function (err, rows) {
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

router.post('/modify/:CONT_ID', function (req, res, next) {
  var cont_id = req.params.CONT_ID;
  var title = req.body.title;
  var content = req.body.content;

  db.query('UPDATE ' + DB_NAME + ' SET TITLE=?, CONTENT=? WHERE CONT_ID=?', [title, content, cont_id], function (err, rows, fields) {
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
 * 글 삭제 페이지
 */
router.post('/delete/:CONT_ID', function (req, res, next) {
  var cont_id = req.params.CONT_ID;

  db.query('DELETE FROM ' + DB_NAME + ' WHERE CONT_ID = ?', [cont_id], function (err, rows, fields) {
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
module.exports = router;
