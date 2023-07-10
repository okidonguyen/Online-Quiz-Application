// Khai báo ban đầu
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const User = require("./data/mongod/user.model");
const Top = require("./data/mongod/top.model");
const readXlsxFile = require("read-excel-file/node");

let app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.set("trust proxy", 1);
const finishedTime = 3000000;

// KHAI BÁO KẾT NỐI CSDL
const DB_CONFIG = "mongodb://localhost/tracnghiemkb";
mongoose.set("useCreateIndex", true);
mongoose.set("useFindAndModify", false);
(async () => {
  try {
    const connection = await mongoose.connect(DB_CONFIG, {
      useNewUrlParser: true
    });
    if (connection === mongoose) {
      console.log("Successfully connected to the database");
    }
  } catch (err) {
    console.log("error: " + err);
  }
})();

// Khai báo sử dụng Json parser
//app.use("/static", express.static("static"));
app.use(express.static(path.join(__dirname, "/"), {
  index: false
}))
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

// Khai báo session
app.use(
  session({
    secret: "tracnghiemkbchinhthic",
    resave: true,
    saveUninitialized: false
  })
);

// Tạo thư mục temp nếu chưa có
const temp_dir = path.join(process.cwd(), "temp/");
if (!fs.existsSync(temp_dir)) fs.mkdirSync(temp_dir);

// ******************
// CÁC HÀM HỖ TRỢ
// *******************

// Trộn thứ tự mảng
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Lấy bài thi
function getTestingFile(sbd) {
  try {
    if (fs.existsSync(temp_dir + "/" + sbd + ".json")) {
      return JSON.parse(fs.readFileSync(temp_dir + "/" + sbd + ".json", "utf8"));
    } else {
      return null;
    }
  } catch (err) {
    console.log(err);
    return null;
  }
}

// Ghi bài thi
async function writeTestingFile(sbd, content) {
  await fs.writeFileSync(temp_dir + "/" + sbd + ".json", JSON.stringify(content));
}

// Gỡ bài thi
async function removeTestingFile(sbd) {
  let mypath = path.resolve(temp_dir + "/" + sbd + ".json");
  try {
    await fs.unlinkSync(mypath)
    //file removed
  } catch (err) {
    console.log("Không tìm thấy file");
  }
}

// Cập nhật bài thi
async function updateTesting(sbd, command, yourChoices) {
  try {
    // Find current test by sbd
    //let currentTesting = await Testing.findOne({ "sbd": sbd });
    let currentTesting = await getTestingFile(sbd);

    // Check
    if (currentTesting == null) {
      return null;
    } else {
      // Get current index
      let current_index = parseInt(currentTesting.current_index);

      // Get continue index
      let next_index = 0;
      if (command == "next") {
        next_index = ((current_index + 1) >= currentTesting.questions.length ? (currentTesting.questions.length - 1) : (current_index + 1));
      } else if (command == "prev") {
        next_index = (((current_index - 1) <= 0) ? 0 : (current_index - 1));
      } else if (command == "end") {
        next_index = current_index;
        currentTesting.end = Date.now();
      } else {
        next_index = parseInt(command);
      }
      currentTesting.current_index = next_index;

      // COMPARE CHOICES
      let yourQuestion = currentTesting.questions[current_index];

      // Reset answers
      // Kiểm tra đáp án
      let _flag_one = true;

      // Kiểm tra có chọn hay không
      let _flag_two = false;

      //console.log(req.body.yourChoices);
      for (let i = 0; i < yourQuestion.answers.length; i++) {
        //
        yourQuestion.answers[i].yourchoices = JSON.parse(yourChoices[i]);
        //
        if (yourQuestion.answers[i].correct != JSON.parse(yourChoices[i])) {
          _flag_one = false;
        }

        if (JSON.parse(yourChoices[i]) == true) {
          _flag_two = true;
        }
      }

      // Right question
      if (_flag_two) {
        yourQuestion.choicecorrect = _flag_one;
      }

      await writeTestingFile(sbd, currentTesting);
      return currentTesting;
    }
  } catch (e) {
    return null;
  }
}

// ************************
// KẾT THÚC CÁC HÀM HỖ TRỢ
// *************************

// *******
// ROUTER
// *******

// ĐĂNG NHẬP, ĐĂNG XUẤT, ĐĂNG KÝ
// Đăng nhập
app.post("/login", async function (req, res) {
  try {
    let user = await User.findOne({
      sbd: req.body.sbd,
      password: req.body.password
    });
    if (!user) {
      res.render("./login", {
        isLogin: false
      });
    } else {
      req.session.user = user;
      res.redirect("/");
    }
  } catch (e) {
    res.send(e);
  }
});

// Đăng xuất
app.get("/logout", function (req, res) {
  req.session.destroy();
  res.redirect("/");
});

// Đăng ký - Lấy giao diện đăng ký
// eslint-disable-next-line no-unused-vars
app.get("/register", function (req, res) {
  let thietlap = JSON.parse(fs.readFileSync("data/thietlap.json", "utf8"));
  let questions = {};
  for (let key in thietlap) {
    questions[key] = thietlap[key].title;
  }
  res.render("./register", {
    questions: questions
  });
});

// Đăng ký - Lưu dữ liệu đăng ký
app.post("/register", async (req, res) => {
  try {
    let userData = await User.find();
    let temp_count = 1;
    let userid = "";

    // Find user
    userData.forEach(function (user) {
      userid = temp_count.toString().padStart(6, "0");
      if (user.sbd == userid) {
        temp_count++;
      }
    });

    userid = temp_count.toString().padStart(6, "0");

    let newUser = new User();
    newUser.sbd = req.body.sbd;
    newUser.fullname = req.body.fullname;
    newUser.password = req.body.password;
    newUser.shkb = req.body.shkb;
    newUser.group = req.body.groupName;
    newUser.grouptype = req.body.nhomtaikhoan;
    await newUser.save(async function (err) {
      if (err) {
        console.log(err);
        res.redirect("/");
      } else {
        let checkTest = [];
        //userData = await User.find();
        userData.forEach(function (user) {
          let temp = getTestingFile(user.sbd);
          if (temp == null) {
            checkTest.push("Chưa thi");
          } else {
            if (temp.end == null) {
              checkTest.push("Đang thi ...");
            } else {
              checkTest.push("OK");
            }
          }
        })
        res.render("./start-admin", {
          user: req.session.user,
          data: userData,
          check: checkTest
        });
      }
    });
  } catch (e) {
    res.redirect("/");
  }
});

// eslint-disable-next-line no-unused-vars
app.get("/importUser", async (req, res) => {
  try {
    // Clear User
    await User.deleteMany();
    await readXlsxFile("excel/user.xlsx").then(rows => {
      for (let i = 0; i < rows.length; i++) {
        let newUser = new User();
        newUser.sbd = rows[i][0];
        newUser.fullname = rows[i][1];
        newUser.password = rows[i][2];
        newUser.shkb = rows[i][3];
        newUser.group = rows[i][4];
        newUser.grouptype = rows[i][5];
        newUser.save(async function (err) {
          if (err) {
            console.log(err);
          }
        });
      }
    });

    res.redirect("/");
  } catch (e) {
    console.log(e);
    res.redirect("/");
  }
});

app.get("/setting", function (req, res) {
  if (typeof req.session.user != "undefined") {
    let thietlap = JSON.parse(fs.readFileSync("data/thietlap.json", "utf8"));
    let questions = {};
    for (let key in thietlap) {
      questions[key] = thietlap[key].title;
    }
    res.render("./setting-index", {
      user: req.session.user,
      questions: questions
    });
  } else {
    res.redirect("/");
  }
});

app.get("/getSetting/:bocauhoi", function (req, res) {
  if (typeof req.session.user != "undefined") {
    let thietlap = JSON.parse(fs.readFileSync("data/thietlap.json", "utf8"));
    let chitiet = {};
    for (let key in thietlap) {
      if (key == req.params.bocauhoi) {
        chitiet = thietlap[key];
      }
    }
    res.render("./setting", {
      bocauhoi: req.params.bocauhoi,
      chitiet: chitiet
    });
  } else {
    res.send("Có lỗi hệ thống");
  }
});

app.get("/setting-add", function (req, res) {
  if (typeof req.session.user != "undefined") {
    //let bocauhoi = JSON.parse(fs.readFileSync("data/bocauhoi.json", "utf8"));
    // for (let key in bocauhoi) {
    //   console.log(key);
    // }
    res.render("./setting-add", {
      user: req.session.user
    });
  } else {
    res.redirect("/");
  }
});

app.post("/setting-add", async function (req, res) {
  if (typeof req.session.user != "undefined") {
    try {
      let thietlap = JSON.parse(fs.readFileSync("data/thietlap.json", "utf8"));
      let timespan = Date.now();
      let newSetting = {
        "title": req.body.title,
        "tongsocau": 0,
        "tongthoigian": req.body.tongthoigian,
        "socauhoi": []
      }
      thietlap[timespan] = newSetting;
      // Ghi bộ câu hỏi
      await fs.writeFileSync("data/thietlap.json", JSON.stringify(JSON.stringify(thietlap)));
    } catch (error) {
      console.log(error);
    }
    res.redirect("/");
  } else {
    res.redirect("/");
  }
});

app.get("/setting-update/:bocauhoi", function (req, res) {
  if (typeof req.session.user != "undefined") {
    let thietlap = JSON.parse(fs.readFileSync("data/thietlap.json", "utf8"));
    let chitiet = null;
    for (let key in thietlap) {
      if (key == req.params.bocauhoi) {
        chitiet = thietlap[key];
      }
    }

    res.render("setting-update", {
      bocauhoi: req.params.bocauhoi,
      chitiet: chitiet,
      user: req.session.user
    });
  } else {
    res.send("Có lỗi hệ thống");
  }
});

app.post("/setting-update", async function (req, res) {
  if (typeof req.session.user != "undefined") {
    try {
      let thietlap = JSON.parse(await fs.readFileSync("data/thietlap.json", "utf8"));
      console.log(thietlap);

      for (let key in thietlap) {
        if (key == req.body.bocauhoi) {
          thietlap[key].title = res.body.title;
          thietlap[key].tongthoigian = res.body.tongthoigian;
        }
      }
      await fs.writeFileSync("data/thietlap.json", JSON.stringify(JSON.stringify(thietlap)));
    } catch (error) {
      console.log(error);
    }
    res.redirect("/setting");
  } else {
    res.send("Có lỗi hệ thống");
  }
});


// Trang INDEX
app.get("/", async function (req, res) {
  if (typeof req.session.user == "undefined") {
    // Nếu chưa đăng nhập, đăng nhập
    res.render("login");
  } else {
    try {
      if (req.session.user.grouptype == "admin") {
        // Kiểm tra nếu là quản trị, trả về trang quản trị viên
        let checkTest = [];
        let userData = await User.find().sort({
          _id: 1
        });
        userData.forEach(function (user) {
          let temp = getTestingFile(user.sbd);
          if (temp == null) {
            checkTest.push("Chưa thi");
          } else {
            if (temp.end == null) {
              checkTest.push("Đang thi ...");
            } else {
              checkTest.push("OK");
            }
          }
        });
        res.render("./start-admin", {
          user: req.session.user,
          data: userData,
          check: checkTest
        });
      } else {
        // Kiểm tra nếu là người dự thi
        let currentTesting = getTestingFile(req.session.user.sbd);
        if (currentTesting == null) {
          // Nếu chưa thi, trả về trang bắt đầu thi
          res.render("./start", {
            user: req.session.user,
            data: await Top.find({
              sbd: req.session.user.sbd
            }),
            bocauhoi: JSON.parse(fs.readFileSync("data/thietlap.json", "utf8"))
          });
        } else {
          // Nếu đã bắt đầu thi
          if (currentTesting.end == null) {
            // Đang thi
            res.render("./index", {
              data: currentTesting.questions,
              current: currentTesting.current_index,
              user: req.session.user,
              start: currentTesting.start,
              nowtime: Date.now()
            });
          } else {
            // Hoàn thành bài thi
            let data = currentTesting.questions;
            let start = currentTesting.start;
            let end = currentTesting.end;
            let user = req.session.user;
            let distance = parseInt(end) - parseInt(start);

            let count_mark = 0;
            for (let i = 0; i < data.length; i++) {
              //console.log(data[i].choicecorrect);
              if (data[i].choicecorrect == true) {
                count_mark++;
              }
            }
            res.render("./completed-index", {
              data: data,
              mark: count_mark,
              user: user,
              distance: distance
            });
          }
        }
      }

    } catch (error) {
      res.send(error);
    }
  }
});


app.get("/total", async function (req, res) {
  let total = {
    dutoan: {
      name: "Dự toán",
      caudung: 0,
      causai: 0
    },
    thu: {
      name: "Thu",
      caudung: 0,
      causai: 0
    },
    khac: {
      name: "Khác",
      caudung: 0,
      causai: 0
    },
    mlns: {
      name: "MLNS",
      caudung: 0,
      causai: 0
    },
    bctcnn: {
      name: "Báo cáo tài chính",
      caudung: 0,
      causai: 0
    },
    thanhtoan: {
      name: "Thanh toán",
      caudung: 0,
      causai: 0
    },
    mosudungtaikhoan: {
      name: "Mở tài khoản",
      caudung: 0,
      causai: 0
    },
    chi: {
      name: "Chi",
      caudung: 0,
      causai: 0
    },
    baocao: {
      name: "Báo cáo",
      caudung: 0,
      causai: 0
    },
    luatnsnn: {
      name: "Luật NSNN - Kế toán",
      caudung: 0,
      causai: 0
    },
    quyettoannsnn: {
      name: "Quyết toán",
      caudung: 0,
      causai: 0
    },
    camketchi: {
      name: "Cam kết chi",
      caudung: 0,
      causai: 0
    },
    chithuongxuyen: {
      name: "Chi thường xuyên",
      caudung: 0,
      causai: 0
    },
    chitienmat: {
      name: "Chi tiền mặt",
      caudung: 0,
      causai: 0
    },
    dautuoda: {
      name: "Đầu tư ODA",
      caudung: 0,
      causai: 0
    },
    daututrongnuoc: {
      name: "Đầu tư trong nước",
      caudung: 0,
      causai: 0
    },
    dautuxa: {
      name: "Đầu tư Xã",
      caudung: 0,
      causai: 0
    },
    luatdautucong: {
      name: "Luật đầu tư công",
      caudung: 0,
      causai: 0
    },
    luatnsnnksc: {
      name: "Luật NSNN - KSC",
      caudung: 0,
      causai: 0
    },
    luatxaydung: {
      name: "Luật xây dựng",
      caudung: 0,
      causai: 0
    },
    viphamhanhchinh: {
      name: "Vi phạm hành chính",
      caudung: 0,
      causai: 0
    },
    bskt: {
      name: "Bộ đề Bổ sung - Kế toán",
      caudung: 0,
      causai: 0
    },
    bbkt: {
      name: "Bộ đề Bắt buộc - Kế toán",
      caudung: 0,
      causai: 0
    },
    bsksc: {
      name: "Bộ đề Bổ sung - KSC",
      caudung: 0,
      causai: 0
    },
    bbksc: {
      name: "Bộ đề Bắt buộc - KSC",
      caudung: 0,
      causai: 0
    }
  };

  let userData = await User.find().sort({
    _id: 1
  });
  userData.forEach(function (user) {
    let temp = getTestingFile(user.sbd);
    if (temp != null && temp.end != null) {
      temp.questions.forEach(function (answer) {
        if (answer.choicecorrect == true) {
          total[answer.quesname].caudung = total[answer.quesname].caudung + 1;
        } else {
          total[answer.quesname].causai = total[answer.quesname].causai + 1;
        }
      });
    }
  });
  res.render("./total", {
    total: total,
    user: req.session.user
  });
})

// Bắt đầu bài thi
app.post("/startquiz", async function (req, res) {
  try {
    let sbd = req.session.user.sbd;
    let currentTesting = getTestingFile(sbd);

    if (currentTesting == null) {
      let thietlap = fs.readFileSync("data/thietlap.json", "utf8");
      let jsonContent = JSON.parse(thietlap);

      let readQuiz = fs.readFileSync("data/bocauhoi.json", "utf8");
      let jsonData = JSON.parse(readQuiz);

      let socauhoi = jsonContent[req.body.bocauhoi].socauhoi;

      let newTesting = {
        sbd: sbd,
        bocauhoi: req.body.bocauhoi,
        questions: [],
        current_index: 0,
        start: Date.now(),
        end: null
      };

      // Lấy số câu hỏi của mỗi bộ đề dutoan, luatnsnn, ...
      for (let i = 0; i < socauhoi.length; i++) {
        // Với mỗi số câu/bộ đề chèn vào bộ đề ngẫu nhiên để thi
        let temp_cauhoi = shuffle(jsonData[socauhoi[i].bocauhoi]);
        for (let j = 0; j < socauhoi[i].socau; j++) {
          // Nếu số câu hỏi thiết lập > số câu hỏi thực tế
          if (
            parseInt(socauhoi[i].socau) <=
            jsonData[socauhoi[i].bocauhoi].length
          ) {
            newTesting.questions.push(temp_cauhoi[j]);
          } else {
            //console.log("Đề quá ít"), lấy cô hỏi theo số ngẫu nhien
            let cauhoi =
              jsonData[socauhoi[i].bocauhoi][
              Math.floor(
                Math.random() * jsonData[socauhoi[i].bocauhoi].length
              )
              ];
            newTesting.questions.push(cauhoi);
          }
        }
      }
      // Trộn tất cả câu hỏi của bộ đề
      newTesting.questions = shuffle(newTesting.questions);

      // for (let i = 0; i < socauhoi.length; i++) {
      //   // Lấy tất cả các câu trong bộ đề
      //   for (let j = 0; j < jsonData[socauhoi[i].bocauhoi].length; j++) {
      //     newTesting.questions.push(jsonData[socauhoi[i].bocauhoi][j]);
      //   }
      // }

      // Ghi bộ câu hỏi ra file trong thư mục JSON
      writeTestingFile(sbd, newTesting);
      // Chuyển về trang chủ   
      res.redirect("/");
    } else {
      // Chuyển về trang chủ         
      res.redirect("/");
    }
  } catch (error) {
    res.send(error);
  }
});

// Gỡ bài thi
app.get("/restartTest/:sbd", async function (req, res) {
  // Kiểm tra và xóa file
  await removeTestingFile(req.params.sbd);
  await Top.deleteOne({
    "sbd": req.params.sbd
  })
  // Chuyển về trang chủ
  res.redirect("/");
});

// Câu hỏi tiếp theo
app.post("/nextQuestion", async function (req, res) {
  let currentTesting = await updateTesting(
    req.session.user.sbd,
    "next",
    req.body.yourchoices
  );
  if (currentTesting != null) {
    res.render("./question", {
      data: currentTesting.questions,
      current: currentTesting.current_index,
      user: req.session.user,
      start: currentTesting.start,
      nowtime: Date.now()
    });
  } else {
    res.redirect("/");
  }
});

// Câu hỏi trước
app.post("/previousQuestion", async function (req, res) {
  let currentTesting = await updateTesting(
    req.session.user.sbd,
    "prev",
    req.body.yourchoices
  );
  if (currentTesting != null) {
    res.render("./question", {
      data: currentTesting.questions,
      current: currentTesting.current_index,
      user: req.session.user,
      start: currentTesting.start,
      nowtime: Date.now()
    });
  } else {
    res.redirect("/");
  }
});

// Di chuyển đến câu hỏi
app.post("/moveQuestion", async function (req, res) {
  let currentTesting = await updateTesting(
    req.session.user.sbd,
    parseInt(req.body.moveindex),
    req.body.yourchoices
  );
  if (currentTesting != null) {
    res.render("./question", {
      data: currentTesting.questions,
      current: currentTesting.current_index,
      user: req.session.user,
      start: currentTesting.start,
      nowtime: Date.now()
    });
  } else {
    res.redirect("/");
  }
});

// Bảng xếp hạng
app.get("/top", async function (req, res) {
  let thietlap = JSON.parse(fs.readFileSync("data/thietlap.json", "utf8"));
  let data = {};
  let data_btn = {};
  for (let key in thietlap) {
    //console.log(key);
    let temp_data = await Top.find({
      "bocauhoi": key
    }).sort({
      mark: -1,
      time: 1
    });
    data[key] = temp_data;
    data_btn[key] = thietlap[key].title;
  }

  res.render("./top", {
    bocauhoi: data,
    btn: data_btn,
    user: req.session.user
  });
});

app.get("/grouptop", async function (req, res) {

  let top = await Top.aggregate([{
    $unwind: "$group"
  },
  {
    $group: {
      _id: "$group",
      count: {
        $sum: 1
      },
      totalmark: {
        $avg: "$mark"
      },
      totaltime: {
        $avg: "$time"
      }
    }
  },
  {
    $sort: {
      "totalmark": -1,
      "totaltime": 1
    }
  }
  ]);
  //console.log(top);

  res.render("./grouptop", {
    user: req.session.user,
    top: top
  });

});

// Hoàn thành
app.post("/completed", async function (req, res) {
  let currentTesting = await updateTesting(
    req.session.user.sbd,
    "end",
    req.body.yourchoices
  );

  //console.log(currentTesting);
  if (currentTesting != null) {
    let data = currentTesting.questions;
    let start = currentTesting.start;
    let user = req.session.user;

    let now = new Date().getTime();
    let distance = parseInt(now) - parseInt(start);

    let count_mark = 0;
    for (let i = 0; i < data.length; i++) {
      //console.log(data[i].choicecorrect);
      if (data[i].choicecorrect == true) {
        count_mark++;
      }
    }

    try {
      let newTop = new Top();
      newTop.sbd = user.sbd;
      newTop.fullname = user.fullname;
      newTop.group = user.group;
      newTop.bocauhoi = currentTesting.bocauhoi;
      newTop.mark = count_mark;
      newTop.time = distance;
      newTop.starttime = start;
      newTop.endtime = now;

      await newTop.save(async function (err) {
        if (err) {
          console.log(err);
        }
        res.render("./completed", {
          data: data,
          mark: count_mark,
          user: user,
          distance: distance,
          starttime: start,
          endtime: now
        });
      });

    } catch (e) {
      res.send(e);
    }
  } else {
    res.redirect("/");
  }
});

// Lấy danh sách tài khoản
app.get("/viewResult/:sbd", async function (req, res) {
  try {
    let currentTesting = getTestingFile(req.params.sbd);
    if (currentTesting != null) {
      let data = currentTesting.questions;
      let start = currentTesting.start;
      let end = currentTesting.end;
      let user = req.session.user;
      let distance = parseInt(end) - parseInt(start);

      // Đếm số câu đúng
      let count_mark = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i].choicecorrect == true) {
          count_mark++;
        }
      }
      res.render("./completed", {
        data: data,
        mark: count_mark,
        user: user,
        distance: distance,
        start: start,
        end: end
      });
    } else {
      res.send("<h1>THÍ SINH CHƯA THI!!!</h1>");
    }

  } catch (error) {
    console.log(error);
  }
});

// Lấy danh sách tài khoản
app.get("/getUser/:sbd", async function (req, res) {
  try {
    let temp_txt = "";
    let user = await User.findOne({
      sbd: req.params.sbd
    });
    if (!user) {
      res.send("");
    } else {
      temp_txt = user.fullname + " - " + user.group;
    }
    res.end(temp_txt);
  } catch (error) {
    console.log(error);
  }
});

// Lấy nhóm tài khoản
app.get("/getGroupName/:shkb", function (req, res) {
  let readJson = fs.readFileSync("data/donvi.json", "utf8");
  let donvi = JSON.parse(readJson);
  let shkb = req.params.shkb;
  let temp_txt = "";
  if (donvi[shkb] != undefined) {
    temp_txt = donvi[shkb];
  }
  //console.log(shkb);
  res.send(temp_txt);
});

// eslint-disable-next-line no-unused-vars
app.get("/import", function (req, res) {
  let temp_bocauhoi = {
    dutoan: [],
    thu: [],
    khac: [],
    mlns: [],
    bctcnn: [],
    thanhtoan: [],
    mosudungtaikhoan: [],
    chi: [],
    baocao: [],
    luatnsnn: [],
    quyettoannsnn: [],
    camketchi: [],
    chithuongxuyen: [],
    chitienmat: [],
    dautuoda: [],
    daututrongnuoc: [],
    dautuxa: [],
    luatdautucong: [],
    luatnsnnksc: [],
    luatxaydung: [],
    viphamhanhchinh: [],
    bbkt: [],
    bbksc: [],
    bskt: [],
    bsksc: []
  };

  readXlsxFile("excel/datafinal.xlsx").then(rows => {
    //Thêm số câu hỏi
    for (let i = 0; i < rows.length; i++) {
      let temp_cauhoi = {
        id: i + 1,
        quesname: rows[i][0],
        text: rows[i][1],
        type: "mot",
        choicecorrect: null,
        answers: [{
          text: rows[i][2],
          correct: rows[i][6]
            .toString()
            .trim()
            .toUpperCase() == "A" ?
            true : false,
          yourchoices: null
        },
        {
          text: rows[i][3],
          correct: rows[i][6]
            .toString()
            .trim()
            .toUpperCase() == "B" ?
            true : false,
          yourchoices: null
        },
        {
          text: rows[i][4],
          correct: rows[i][6]
            .toString()
            .trim()
            .toUpperCase() == "C" ?
            true : false,
          yourchoices: null
        },
        {
          text: rows[i][5],
          correct: rows[i][6]
            .toString()
            .trim()
            .toUpperCase() == "D" ?
            true : false,
          yourchoices: null
        }
        ]
      };
      temp_bocauhoi[rows[i][0]].push(temp_cauhoi);
      //console.log(rows[i][0]);
      let jsonString = JSON.stringify(temp_bocauhoi);
      // Ghi bộ câu hỏi
      fs.writeFile("data/bocauhoi.json", jsonString, error => {
        if (error != null) {
          console.log(error);
        }
      });
    }
  });
  res.redirect("/");
});

let server = app.listen(process.env.PORT || 4000, function () {
  let host = server.address().address;
  let port = server.address().port;
  console.log("Example app listening at 4000", host, port);
});