window.UPDATE_COUNTER = 0;

if (window.location.pathname.includes("brand")) {
  TextType.start();
}

$(".google_font")
  .fontpicker({
    lang: "en",
    variants: true,
    lazyLoad: true,
    showClear: true,
    nrRecents: 3,
    placeholder: "Search Fonts",
    lookahead: 150,
  })
  .change(function () {
    var $this = $(this);

    $this.addClass("touched");
    updateGoogleFont($this, true);
    addTabState("fonts", "draft");
  });

$(document)
  .on("change", '[type="file"]', function () {
    var $this = $(this);

    $this.addClass("touched");

    if ($this.attr("accept") === ".ttf") {
      // $this.val().split(".")[1] === "ttf"

      updateFont($this, true, true);
      addTabState("fonts", "draft");
    } else {
      var $container = $this.closest(".onboarding-logo-inner");
      $container.find(".logo-select-wrapper").addClass("floating");

      $this.removeClass("svg-string");

      uploadLogo($container, true);
      addTabState("logo", "draft");
    }

    return;
  })
  .on("change", "#upload-assets", function () {
    if ($(this).get(0).files.length > 0) {
      $(".upload-assets-btn").addClass("upload-assets-btn-active");
    } else {
      $(".upload-assets-btn").removeClass("upload-assets-btn-active");
    }
  })
  .on("input", '[type="color"]', function () {
    var $this = $(this),
      name = $(this).attr("name"),
      val = $(this).val();

    $this.addClass("touched");
    draft_brand.colors[name] = val;

    clearTimeout(window.colorTimeout);
    window.colorTimeout = setTimeout(function () {
      // displayBrand(draft_brand);
      addTabState("colors", "draft");
    }, 300);
  })
  .on("input", '[type="text"]', function () {
    var $this = $(this),
      name = $(this).attr("name"),
      val = $(this).val();

    $this.addClass("touched");
    addTabState("info", "draft");
  })
  .on("click", "[data-save-brand]", function () {
    if ($(this).hasClass("save-brand-active")) {
      console.log("UPDATING ");
      updateLogos();
      updateColors();
      updateFonts();
      updateGoogleFonts();
      updateInfo();
    } else {
      console.log("Nothing changed");
    }
  });

$("html").on("dragenter", function (e) {
  e.preventDefault();
  e.stopPropagation();
});
// Drag logo
$(".onboarding-logo-inner").bind("dragover", function (e) {
  e.preventDefault();
  e.stopPropagation();

  $(this).addClass("drag-over");
});
$(".onboarding-logo-inner").bind("dragleave", function (e) {
  e.preventDefault();
  e.stopPropagation();

  $(this).removeClass("drag-over");
});
$(".onboarding-logo-inner").bind("drop", function (e) {
  e.preventDefault();
  e.stopPropagation();

  $(this).removeClass("drag-over");

  var file = e.originalEvent.dataTransfer.files[0];
  var { type, name } = file;

  const allowedTypes = ["image/svg+xml", "application/pdf"];
  if (allowedTypes.includes(type)) {
    var $input = $(this).find('[type="file"]');
    $input.addClass("touched");
    $input[0].files = e.originalEvent.dataTransfer.files;

    var $container = $input.closest(".onboarding-logo-inner");
    $container.find(".logo-select-wrapper").addClass("floating");

    $input.removeClass("svg-string");

    uploadLogo($(this), true);
    addTabState("logo", "draft");
  } else {
    alert("Unsupported file type. Please upload a .pdf, .ai or .svg");
  }
});
// Drag font
$(".onboarding-font-row").bind("dragover", function (e) {
  e.preventDefault();
  e.stopPropagation();

  $(this).addClass("drag-over");
});
$(".onboarding-font-row").bind("dragleave", function (e) {
  e.preventDefault();
  e.stopPropagation();

  $(this).removeClass("drag-over");
});
$(".onboarding-font-row").bind("drop", function (e) {
  e.preventDefault();
  e.stopPropagation();

  $(this).removeClass("drag-over");

  var file = e.originalEvent.dataTransfer.files[0];
  var { name } = file;
  var type = name.split(".")[1];
  const allowedTypes = ["ttf", "otf"];
  if (allowedTypes.includes(type)) {
    var $input = $(this).find('[type="file"]');
    $input.addClass("touched");
    $input[0].files = e.originalEvent.dataTransfer.files;

    updateFont($(this), true);
    addTabState("fonts", "draft");
  } else {
    alert("Unsupported file type. Please upload a .ttf or .otf");
  }
});

function updateLogos() {
  $(".onboarding-logo-inner").each(function () {
    uploadLogo($(this), false);
  });
}

function uploadLogo($this, draft) {
  var $file = $this.find('[type="file"].touched');

  if ($file.length) {
    var type = $file.data("file-type"),
      name = $file.attr("name"), // $file[0].files[0].name
      file = $file[0].files[0],
      data = new FormData();

    if ($file.hasClass("svg-string")) {
      var svgString = $file
        .siblings(".onboarding-logo-preview")
        .find("svg")
        .prop("outerHTML");

      file = new File([svgString], name + ".svg");
    }

    data.append(name, file);
    data.append("name", name);

    uploadFile($this, type, draft, data, name);
  }
}

function trimSvg(svg) {
  var bbox = svg.getBBox();
  if (bbox.width === 0 || bbox.height === 0) {
    return svg;
  }

  var viewBox = [bbox.x, bbox.y, bbox.width, bbox.height].join(" ");
  svg.setAttribute("viewBox", viewBox);
  return svg;
}

function uploadFile($this, type, draft, data, name) {
  window.UPDATE_COUNTER++;
  $this.loading();

  $.ajax({
    url: "/brand/" + type + (draft ? "?draft=1" : ""),
    data: data,
    type: "POST",
    contentType: false,
    processData: false,
    success: function (res) {
      if (res.success) {
        if ($this.find(".onboarding-logo-preview").length) {
          $this.find(".onboarding-logo-preview").children("svg").remove();
          $this
            .find(".onboarding-logo-preview")
            .prepend($(res.brand.logos[name]));

          var trimmedSvg = $(
            trimSvg($this.find(".onboarding-logo-preview").children("svg")[0])
          );
          $this.find(".onboarding-logo-preview").children("svg").remove();
          $this.find(".onboarding-logo-preview").prepend(trimmedSvg);

          $this.find('[type="file"].touched').addClass("svg-string");
        }
        if (!draft) {
          $this.find('[type="file"]').removeClass("touched");
          
          $(`[data-tab-content="colors"]`)
            .find(".onboarding-logo-preview")
            .children("svg")
            .remove();
          var newSvg = trimmedSvg.clone();
          $(`[data-tab-content="colors"]`)
            .find(".onboarding-logo-preview")
            .prepend(newSvg);
        } else {
          // draft_brand.logos[name] = res.brand.logos[name];
          // displayBrand(draft_brand);
        }
      } else {
        alert(res.error ? JSON.stringify(res.error) : "Something went wrong!");
      }

      $this.stopLoading();

      window.UPDATE_COUNTER--;
      if (window.UPDATE_COUNTER === 1) {
        displayBrand();
      }

      addTabState("logo", draft ? "draft" : "success");
    },
    error: function (err) {
      $this.stopLoading();
      addTabState("logo", "failed");
      console.log(err);
    },
  });
}

function updateColors(noreload, cb) {
  $('[type="color"]').each(function () {
    var $this = $(this),
      name = $this.attr("name"),
      val = $this.val();

    if ($this.hasClass("touched")) {
      window.UPDATE_COUNTER++;
      $this.closest(".onboarding-color-outer").loading();
      $.post("/brand/color", {
        name: name,
        color: val,
      })
        .then(function (res) {
          $this.closest(".onboarding-color-outer").stopLoading();
          if (res.success) {
            $this.removeClass("touched");

            $(name === "primary" ? ".color-primary" : ".color-secondary").css("background-color", val);
            $(name === "primary" ? "#primary" : "#secondary").css("background-color", val);

            $(name === "primary" ? "#primary" : "#secondary").attr("value", val);
            $(name === "primary" ? "#primary" : "#secondary").attr("data-secondary-color", val);
          }
          window.UPDATE_COUNTER--;
          if (window.UPDATE_COUNTER === 1) {
            displayBrand();
          }

          addTabState("colors", "success");

          if (!noreload) {
            // window.location.reload(); // to refresh logo colors
          }

          if (cb) {
            cb();
          }
        })
        .catch((err) => {
          $this.closest(".onboarding-color-outer").stopLoading();
          addTabState("colors", "failed");
          console.log(err);
        });
    }
  });
}

function processBrandAssetPayment(dirPM, skipPayment) {
  let pmId = dirPM || $('input[name="selected-card"]:checked').val();
  if (!pmId && !skipPayment) return;

  var $file = $("#upload-assets");

  let data = new FormData();
  Promise.all(
    Array.from($file[0].files).map((file, idx) => {
      console.log(file);
      data.append(idx, file);
    })
  );

  data.append("skipPayment", skipPayment);

  $.ajax({
    url: `/brand/brand-assets-payment${
      skipPayment ? "" : "?paymethod=" + pmId
    }`,
    data: data,
    type: "POST",
    contentType: false,
    processData: false,
    success: function (res) {
      console.log("SUCCESS");
      $("#cards-popup").addClass("d-none");
      setAskForHelpTab("complete");
    },
    error: function (err) {
      console.log("ERROR");
      alert(JSON.stringify(err));
    },
  });
}

function uploadAssets(skipPayment) {
  skipPayment
    ? processBrandAssetPayment(-1, skipPayment)
    : $("#cards-popup").removeClass("d-none");
}

function updateFonts() {
  $("[data-font-form]").each(function () {
    var $this = $(this);

    updateFont($this);
  });
}

function updateFont($this, draft, isInput) {
  var $file = isInput ? $this : $this.find('[type="file"].touched');

  if ($file.length) {
    var type = $file.data("file-type"),
      name = $file.attr("name"),
      file = $file[0].files[0],
      data = new FormData();

    window.UPDATE_COUNTER++;

    data.append(name, file);
    data.append("name", name);

    $this.loading();

    $.ajax({
      url: "/brand/" + type + (draft ? "?draft=1" : ""),
      data: data,
      type: "POST",
      contentType: false,
      processData: false,
      success: function (res) {
        if (res.success) {
          $('[data-font-form="' + name + '"]')
            .find(".font-name")
            .text(res.brand.fonts[name].name);

          updateFontCSS(name, res);

          if (!draft) {
            $this.find('[type="file"]').removeClass("touched");
          } else {
            // draft_brand.fonts[name] = res.brand.fonts[name];
            // displayBrand(draft_brand);
          }
        }

        $this.stopLoading();
        // $this.addClass("d-none").next().removeClass("d-none");
        window.UPDATE_COUNTER--;
        if (window.UPDATE_COUNTER === 1) {
          displayBrand();
        }

        addTabState("fonts", draft ? "draft" : "success");
      },
      error: function (err) {
        window.UPDATE_COUNTER--;
        if (window.UPDATE_COUNTER === 1) {
          displayBrand();
        }

        $this.stopLoading();
        addTabState("fonts", "failed");
        console.log(err);
      },
    });
  }
}

function updateGoogleFonts() {
  $(".google_font").each(function () {
    var $this = $(this);

    updateGoogleFont($this);
  });
}

function updateGoogleFont($this, draft) {
  if ($this.hasClass("touched")) {
    var name = $this.attr("name");
    var font = $this.val().replace(/\+/g, " ").split(":");

    var fontFamily = font[0];
    var fontSpecs = font[1] || null;
    var italic = false,
      fontWeight = 400;

    if (/italic/.test(fontSpecs)) {
      italic = true;
      fontSpecs = fontSpecs.replace("italic", "");
    }
    fontWeight = +fontSpecs;

    window.UPDATE_COUNTER++;

    $(".template-loader-new").show();
    TextType.start();

    $this.closest(".onboarding-font-row").loading();
    $.post("/brand/font" + (draft ? "?draft=1" : ""), {
      name: name,
      family: fontFamily,
      weight: fontWeight,
      fontStyle: italic ? "italic" : "normal",
      value: $this.val(),
    })
      .then(function (res) {
        $this.closest(".onboarding-font-row").stopLoading();

        window.UPDATE_COUNTER--;

        if (res.success) {
          $('[data-font-form="' + name + '"]')
            .find(".font-name")
            .text(fontFamily);

          updateFontCSS(name, res);

          if (!draft) {
            $this.removeClass("touched");
          } else {
            // draft_brand.fonts[name] = res.brand.fonts[name];
            // displayBrand(draft_brand);
          }

          if (window.UPDATE_COUNTER === 1) {
            displayBrand();
          }

          addTabState("fonts", draft ? "draft" : "success");
        }
      })
      .catch(function (err) {
        window.UPDATE_COUNTER--;
        if (window.UPDATE_COUNTER === 1) {
          displayBrand();
        }

        $this.closest(".onboarding-font-row").stopLoading();
        addTabState("fonts", "failed");
        console.log(err);
      });
  }
}

function updateFontCSS(ff, res) {
  $("head").append(
    res.brand.fonts[ff].google
      ? "<link href='https://fonts.googleapis.com/css?family=" +
          res.brand.fonts[ff].name
          .replace(/([A-Z][a-z0-9]+)/g, '+$1').replace(/\s{2}/g,"").trim().replace(/ /g, "").replace(/^\+/, '') +
          "' rel='stylesheet' type='text/css'>"
      : `@font-face {
                    font-family: 'user${ff}Font';
                    src: url('/files/<%= user && user.account && user.account.id %>/fonts/<%= brand && brand.fonts && brand.fonts.${ff} && brand.fonts.${ff}.path %>') format('truetype');
                    font-weight: ${
                      ff === "Italic"
                        ? "normal"
                        : ff === "BoldItalic"
                        ? "bold"
                        : ff.toLowerCase()
                    };
                    font-style: ${
                      ff === "Italic" || ff === "BoldItalic"
                        ? "italic"
                        : "normal"
                    };
                }`
  );

  $(`.user${ff}Font`).css("font-family", '"' + res.brand.fonts[ff].name .replace(/([a-z])([A-Z])/g, "$1 $2") .replace(/ /g, " ") + '"');
}

function updateInfo(draft) {
  var data = {};

  $('[type="text"].touched').each(function () {
    var $this = $(this);
    $this.removeClass("touched");
    var name = $this.attr("name"),
      val = $this.val();

    data[name] = val;
  });

  if (!Object.keys(data).length) {
    return;
  }

  $(".template-loader-new").show();
  TextType.start();

  $('[data-tab-content="info"]').loading();

  $.post("/brand/info" + (draft ? "?draft=1" : ""), data)
    .then(function (res) {
      $('[data-tab-content="info"]').stopLoading();

      window.UPDATE_COUNTER--;

      if (res.success) {
        if (!draft) {
          // $this.removeClass("touched");
        } else {
          // displayBrand(draft_brand, true);
        }

        if (window.UPDATE_COUNTER === 1) {
          displayBrand();
        }

        addTabState("info", draft ? "draft" : "success");

        window.location.reload();
      }
    })
    .catch(function (err) {
      window.UPDATE_COUNTER--;
      if (window.UPDATE_COUNTER === 1) {
        displayBrand();
      }

      $('[data-tab-content="info"]').stopLoading();
      addTabState("info", "failed");
      console.log(err);
    });
}

function displayBrand(brand, runAI) {
  if (!window.location.pathname.includes("setup")) {
    $(".template-loader-new").show();
    TextType.start();

    getCustomization(
      {
        //ignoreCache : true
        brand: brand,
        runAI: runAI,
        row_class_name: "test",
      },
      function () {
        if (!brand) {
          // is draft
        }

        // $(".template-loader-new").fadeOut(300);
      }
    );
  }
}

function addTabState(type, state) {
  let elmID = `#${type}-tab`;

  switch (state) {
    case "failed":
      $(elmID).find(".fa-stack").remove();
      $(elmID).append(
        '<span class="fa-stack"><i style="color:#EB2121;" class="fas fa-circle fa-stack-2x"></i><i class="fas fa-times fa-xs fa-stack-1x fa-inverse"></i></span>'
      );
      $(elmID).hover(
        function () {
          $(this).append(
            $(
              '<p style="background-color:#EB2121;" class="indicator-tooltip">Changes failed, Please try again.</p>'
            )
          );
        },
        function () {
          $(this).find("p").last().remove();
        }
      );
      break;
    case "draft":
      $(elmID).find(".fa-stack").remove();
      $(elmID).append(
        '<span class="fa-stack"><i style="color:#EBB221;" class="fas fa-circle fa-stack-2x"></i><i class="fas fa-info fa-xs fa-stack-1x fa-inverse"></i></span>'
      );
      $(elmID).hover(
        function () {
          $(this).append(
            $(
              '<p style="background-color:#EBB221;" class="indicator-tooltip">Pending changes!</p>'
            )
          );
        },
        function () {
          $(this).find("p").last().remove();
        }
      );
      break;
    case "success":
      $(elmID).find(".fa-stack").remove();
      $(elmID).append(
        '<span class="fa-stack"><i style="color:#1EE049;" class="fas fa-circle fa-stack-2x"></i><i class="fas fa-check fa-xs fa-stack-1x fa-inverse"></i></span>'
      );
      $(elmID).hover(
        function () {
          $(this).append(
            $(
              '<p style="background-color:#1EE049;" class="indicator-tooltip">Changes Succeeded!</p>'
            )
          );
        },
        function () {
          $(this).find("p").last().remove();
        }
      );
      break;
  }

  if (state === "draft") {
    $(".save-brand").removeClass("save-brand-active");
    $(".save-brand").addClass("save-brand-active");
    // $(".save-brand").prop("disabled", false);

    $(".onboarding-templates-preview").find("p").last().remove();
    $(".onboarding-templates-preview").prepend(
      $(
        '<p style="background-color:#EBB221;" class="indicator-tooltip-preview">Save your changes to update your brand preview!</p>'
      )
    );
  } else {
    $(".save-brand").removeClass("save-brand-active");
    // $(".save-brand").prop("disabled", true);
    $(".onboarding-templates-preview").find("p").last().remove();
  }

  let count = 0;
  $(".onboarding-logo-preview").each(function () {
    if ($(this).has("svg").length > 0) {
      count++;
    }
  });

  if (count > 2) {
    $(".next-btn").removeClass("next-btn-active");
    $(".next-btn").addClass("next-btn-active");
  } else {
    $(".next-btn").removeClass("next-btn-active");
  }
}
