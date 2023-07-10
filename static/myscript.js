$(document).ready(function () {
  $("body").keydown(function (event) {
    //alert(event.which)
    if (event.which == 13) {
      //event.preventDefault();
    }
  });
});

function getGroupName(shkb) {
  if (shkb.length == 4) {
    $.get("getGroupName/" + shkb, function (data, status) {
      if (data == "") {
        $("#groupName").val("Không tìm thấy tên đơn vị!");
      } else {
        $("#groupName").val(data);
      }
    });
  } else {
    $("#groupName").val("Không tìm thấy tên đơn vị!");
  }
}

function submitUser() {
  if (
    $("#groupName").val() != "Không tìm thấy tên đơn vị!" &&
    $("#fullname").val().length > 0 &&
    $("#password").val().length > 0 &&
    $("#sbd").val().length > 0
  ) {
    $("#registerForm").submit();
  } else {
    $("#registerFormWarning").show();
    $("#registerFormWarning")
      .fadeTo(3000, 500)
      .slideUp(500, function () {
        $("#registerFormWarning").hide();
      });
  }
}

function getUser(sbd) {
  if (sbd.length == 2) {
    $.get("getUser/" + sbd, function (data, status) {
      if (data == "") {
        $("#userinfo").val("Không tìm thấy thông tin!");
        $("#checkinfo").val("false");
      } else {
        $("#userinfo").val(data);
        $("#checkinfo").val("true");
      }
    });
  } else {
    $("#userinfo").val("Không tìm thấy thông tin!");
    $("#checkinfo").val("false");
  }
}

function startQuiz() {
  $("#nameForm").submit();
}

function login() {
  var checkinfo = $("#checkinfo").val();
  if (checkinfo == "true") {
    $("#loginForm").submit();
  } else {
    $("#nameFormWarning").show();
    $("#nameFormWarning")
      .fadeTo(3000, 500)
      .slideUp(500, function () {
        $("#nameFormWarning").hide();
      });
  }
}

function nextQuestion() {
  //event.preventDefault();
  var searchIDs = [];
  $(".answers").map(function () {
    searchIDs.push($(this).prop("checked"));
  });

  $.post(
    "nextQuestion", {
      yourchoices: searchIDs
    },
    function (data, status) {
      $("#root").html(data);
      $("html,body").scrollTop(0);
    }
  );
}

function previousQuestion() {
  //event.preventDefault();
  var searchIDs = [];
  $(".answers").map(function () {
    searchIDs.push($(this).prop("checked"));
  });

  $.post(
    "previousQuestion", {
      yourchoices: searchIDs
    },
    function (data, status) {
      $("#root").html(data);
      $("html,body").scrollTop(0);
    }
  );
}

function moveQuestion(index) {
  //event.preventDefault();
  var searchIDs = [];
  $(".answers").map(function () {
    searchIDs.push($(this).prop("checked"));
  });

  $.post(
    "moveQuestion", {
      yourchoices: searchIDs,
      moveindex: index
    },
    function (data, status) {
      $("#root").html(data);
      $("html,body").scrollTop(0);
    }
  );
}

function completed() {
  //event.preventDefault();
  var searchIDs = [];
  $(".answers").map(function () {
    searchIDs.push($(this).prop("checked"));
  });

  if (confirm("Bạn có chắc muốn kết thúc bài thi!?")) {
    $.post(
      "completed", {
        yourchoices: searchIDs
      },
      function (data, status) {
        $("#root").html(data);
        $("html,body").scrollTop(0);
      }
    );

    for (let i = 0; i < 9999; i++) {
      clearInterval(i);
    }
    document.getElementById("timer").innerHTML = "Làm bài thi";
  }
}

function hardCompleted() {
  //event.preventDefault();
  var searchIDs = [];
  $(".answers").map(function () {
    searchIDs.push($(this).prop("checked"));
  });

  $.post(
    "completed", {
      yourchoices: searchIDs
    },
    function (data, status) {
      $("#root").html(data);
      $("html,body").scrollTop(0);
    }
  );
}

function registerUser() {
  $.get("register", function (data, status) {
    $("#root").html(data);
  });
}

function showChoiceCorrect(tagid, choicenum) {
  if (choicenum == 0) {
    $("#label" + tagid).css({
      color: "red",
      "font-weight": "bold"
    });
  } else {
    $("#label" + tagid).css({
      color: "green",
      "font-weight": "bold"
    });
  }
}

function coundownTimer(startTime, nowTime, endtime) {
  // Set the date we're counting down to

  var starttime = parseInt(startTime);
  var nowtime = parseInt(nowTime);
  var deadline = starttime + parseInt(endtime);

  console.log(starttime);
  console.log(nowtime);
  console.log(deadline);

  // Update the count down every 1 second
  var x = setInterval(function () {
    nowtime = nowtime + 1000;
    // Get todays date and time
    //var now = new Date().getTime();

    // Find the distance between now and the count down date
    var distance = deadline - nowtime;

    // Time calculations for days, hours, minutes and seconds
    //var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Output the result in an element with id="demo"
    document.getElementById("timer").innerHTML =
      "<strong>[ " + hours + "h " + minutes + "m " + seconds + "s ]</strong>";

    // If the count down is over, write some text
    if (distance < 0) {
      clearInterval(x);
      document.getElementById("timer").innerHTML = "HẾT GIỜ!";
      hardCompleted();
    }
  }, 1000);
}