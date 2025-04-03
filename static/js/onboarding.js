window.UPDATE_COUNTER = 0;

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
    // addTabState("fonts", "draft");
  });

$(document)
  .on("change", '[type="file"]', function () {
    var $this = $(this);

    $this.addClass("touched");

    if ($this.attr("accept") === ".ttf") {
      // $this.val().split(".")[1] === "ttf"

      updateFont($this, true, true);
      // addTabState("fonts", "draft");
    } else {
      uploadLogo($this.closest(".onboarding-logo-inner"), true);
      // addTabState("logo", "draft");
    }

    return;
  })
  .on("change", "#upload-assets", function () {
    uploadAssets();
  })
  .on("input", '[type="color"]', function () {
    var $this = $(this),
      name = $(this).attr("name"),
      val = $(this).val();

    $this.addClass("touched");
    draft_brand.colors[name] = val;

    clearTimeout(window.colorTimeout);
    window.colorTimeout = setTimeout(function () {
      displayBrand(draft_brand);
      addTabState("colors", "draft");
    }, 300);
  })
  .on("click", "[data-font-saved] .btn", function () {
    var fontFace = $(this).closest("[data-font-saved]").data("font-saved");
    $('[data-font-form="' + fontFace + '"]')
      .removeClass("d-none")
      .next()
      .addClass("d-none");
  })
  .on("click", "[data-save-brand]", function () {
    console.log("UPDATING ");

    // var logoDfd = $.Deferred();
    // updateLogos(function (res) {
    //   logoDfd.resolve();
    // });
    var colorDfd = $.Deferred();
    updateColors(function (res) {
      console.log("colorDfd");
      colorDfd.resolve();
    });
    var fontDfd = $.Deferred();
    updateFonts(function (res) {
      console.log("fontDfd");
      fontDfd.resolve();
    });
    var gFontDfd = $.Deferred();
    updateGoogleFonts(function (res) {
      console.log("gFontDfd");
      gFontDfd.resolve();
    });

    var promises = [colorDfd, fontDfd, gFontDfd]; // logoDfd

    $.when.apply($, promises).done(function () {
      console.log("show draft");
      $(".draft-account").removeClass("d-none");
    });
  });

$("html").on("dragenter", function () {
  $(this).preventDefault();
  console.log("fuck");
});
$(".onboarding-logo-inner").bind("dragover", function () {
  $(this).addClass("drag-over");
});
$(".onboarding-logo-inner").bind("dragleave", function () {
  $(this).removeClass("drag-over");
});

// $(".onboarding-logo-inner")
//   .on("dragenter", function (e) {
//     console.log("dragenter");
//     e.stopPropagation();
//     e.preventDefault();
//     $(this).addClass("drop");
//   })
//   .on("dragover", function (e) {
//     console.log("dragover");
//     e.stopPropagation();
//     e.preventDefault();
//     $(".onboarding-logo-inner").addClass("drop");
//   })
//   .on("drop", function (e) {
//     e.stopPropagation();
//     e.preventDefault();

//     $(".onboarding-logo-inner").removeClass("drop dragover");

//     var file = e.originalEvent.dataTransfer.files;
//     var formData = new FormData();

//     formData.append("file", file[0]);
//     console.log(formData);
//     // uploadFile(formData);
//   });

function updateLogos(cb) {
  $(".onboarding-logo-inner").each(function () {
    uploadLogo($(this));
  });
}

function uploadLogo($this, draft) {
  var $file = $this.find('[type="file"].touched');

  if ($file.length) {
    var type = $file.data("file-type"),
      name = $file.attr("name"),
      file = $file[0].files[0],
      data = new FormData();

    if ($file.hasClass("svg-string")) {
      var svgString = $file
        .siblings(".onboarding-logo-preview")
        .find("svg")
        .prop("outerHTML");

      file = new File([svgString], type + "svg");
    }

    data.append(name, file);
    data.append("name", name);

    window.UPDATE_COUNTER++;
    $this.loading();

    $.ajax({
      url: "/onboarding/" + type + (draft ? "?draft=1" : ""),
      data: data,
      type: "POST",
      contentType: false,
      processData: false,
      success: function (res) {
        if (res.success) {
          if ($this.find(".onboarding-logo-preview").length) {
            $this.find(".onboarding-logo-preview").html(res.brand.logos[name]);
          }
          if (!draft) {
            $this.find('[type="file"]').removeClass("touched");
          } else {
            draft_brand.logos[name] = res.brand.logos[name];
            displayBrand(draft_brand);
          }
        }

        $this.stopLoading();

        window.UPDATE_COUNTER--;
        if (window.UPDATE_COUNTER === 1) {
          displayBrand();
        }

        addTabState("logo", draft ? "draft" : "success");
      },
      error: function (err) {
        console.log(err);
        addTabState("logo", "failed");
      },
    });
  }
}

function updateColors(cb) {
  var promises = [];

  $('[type="color"]').each(function () {
    var dfd = $.Deferred();

    var $this = $(this),
      name = $this.attr("name"),
      val = $this.val();

    if ($this.hasClass("touched")) {
      window.UPDATE_COUNTER++;
      $this.closest(".onboarding-color-outer").loading();
      $.post("/onboarding/color", {
        name: name,
        color: val,
      })
        .then(function (res) {
          $this.closest(".onboarding-color-outer").stopLoading();
          if (res.success) {
            $this.removeClass("touched");

            dfd.resolve();
          }
          window.UPDATE_COUNTER--;
          if (window.UPDATE_COUNTER === 1) {
            displayBrand();
          }

          // addTabState("colors", "success");
        })
        .catch((err) => {
          $this.closest(".onboarding-color-outer").stopLoading();
          console.log(err);
          alert(err);
          // addTabState("colors", "failed");
        });
    } else {
      dfd.resolve();
    }

    promises.push(dfd);
  });

  $.when.apply($, promises).done(function () {
    if (cb) {
      console.log("updatedColors")
      cb();
    }
  });
}

function updateFonts(cb) {
  var promises = [];

  $("[data-font-form]").each(function () {
    var dfd = $.Deferred();

    var $this = $(this);

    updateFont($this, false, false, function (res) {
      dfd.resolve();
    });

    promises.push(dfd);
  });

  $.when.apply($, promises).done(function () {
    if (cb) {
      console.log("updatedFonts");
      cb();
    }
  });
}

function updateFont($this, draft, isInput, cb) {
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
      url: "/onboarding/" + type + (draft ? "?draft=1" : ""),
      data: data,
      type: "POST",
      contentType: false,
      processData: false,
      success: function (res) {
        if (res.success) {
          for (var ff in res.brand.fonts) {
            $('[data-font-saved="' + ff + '"]')
              .find(".font-name")
              .text(res.brand.fonts[ff].name);
            $('[data-font-saved="' + ff + '"]')
              .find("small")
              .text(res.brand.fonts[ff].google ? "Google" : "Custom");
          }
          $this.addClass("d-none").next().removeClass("d-none");

          if (!draft) {
            $this.find('[type="file"]').removeClass("touched");
          } else {
            draft_brand.fonts[name] = res.brand.fonts[name];
            displayBrand(draft_brand);
          }

          if (cb) {
            cb();
          }
        }

        $this.stopLoading();
        $this.addClass("d-none").next().removeClass("d-none");
        window.UPDATE_COUNTER--;
        if (window.UPDATE_COUNTER === 1) {
          displayBrand();
        }

        // addTabState("fonts", draft ? "draft" : "success");
      },
      error: function (err) {
        window.UPDATE_COUNTER--;
        if (window.UPDATE_COUNTER === 1) {
          displayBrand();
        }

        console.log(err);
        alert(err);
        // addTabState("fonts", "failed");
      },
    });
  } else {
    if (cb) {
      cb();
    }
  }
}

function updateGoogleFonts(cb) {
  var promises = [];

  $(".google_font").each(function () {
    var dfd = $.Deferred();

    var $this = $(this);

    updateGoogleFont($this, false, function () {
      dfd.resolve();
    });

    promises.push(dfd);
  });

  $.when.apply($, promises).done(function () {
    if (cb) {
      console.log("updatedGoogleFonts");
      cb();
    }
  });
}

function updateGoogleFont($this, draft, cb) {
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

    $(".template-loader").show();

    $this.closest(".onboarding-font-row").loading();
    $.post("/onboarding/font" + (draft ? "?draft=1" : ""), {
      name: name,
      family: fontFamily,
      weight: fontWeight,
      fontStyle: italic ? "italic" : "normal",
      value: $this.val(),
    }).then(function (res) {
      $this.closest(".onboarding-font-row").stopLoading();

      window.UPDATE_COUNTER--;

      if (res.success) {
        for (var ff in res.brand.fonts) {
          $('[data-font-saved="' + ff + '"]')
            .find(".font-name")
            .text(res.brand.fonts[ff].name);
          $('[data-font-saved="' + ff + '"]')
            .find("small")
            .text(res.brand.fonts[ff].google ? "Google" : "Custom");
        }
        $this
          .closest("[data-font-form]")
          .addClass("d-none")
          .next()
          .removeClass("d-none");

        if (!draft) {
          $this.removeClass("touched");
        } else {
          draft_brand.fonts[name] = res.brand.fonts[name];
          displayBrand(draft_brand);
        }

        if (window.UPDATE_COUNTER === 1) {
          displayBrand();
        }

        if (cb) {
          cb();
        }
      } else {
        console.log(res)
      }
    });
  } else {
    if (cb) {
      cb();
    }
  }
}

function displayBrand(brand) {
  $(".template-loader").show();

  getCustomization(
    {
      //ignoreCache : true
      brand: brand,
    },
    function () {
      if (!brand) {
        // is draft
        window.location.reload();
      }
    }
  );
}

function addTabState(type, state) {
  let elmID = `#${type}-tab`;

  switch (state) {
    case "failed":
      $(elmID).find(".fa-stack").remove();
      $(elmID).append(
        '<span class="fa-stack"><i style="color:#EB2121;" class="fas fa-circle fa-stack-2x"></i><i class="fas fa-times fa-xs fa-stack-1x fa-inverse"></i></span>'
      );
      break;
    case "draft":
      $(elmID).find(".fa-stack").remove();
      $(elmID).append(
        '<span class="fa-stack"><i style="color:#EBB221;" class="fas fa-circle fa-stack-2x"></i><i class="fas fa-info fa-xs fa-stack-1x fa-inverse"></i></span>'
      );
      break;
    case "success":
      $(elmID).find(".fa-stack").remove();
      $(elmID).append(
        '<span class="fa-stack"><i style="color:#1EE049;" class="fas fa-circle fa-stack-2x"></i><i class="fas fa-check fa-xs fa-stack-1x fa-inverse"></i></span>'
      );
      break;
  }
}

function uploadAssets() {
  var $file = $("#upload-assets");

  let data = new FormData();
  Promise.all(
    Array.from($file[0].files).map((file, idx) => {
      console.log(file);
      data.append(idx, file);
    })
  );
  let skipPayment = true;
  data.append("skipPayment", skipPayment);

  $.ajax({
    url: `/onboarding/brand-assets-payment${
      skipPayment ? "" : "?paymethod=" + pmId
    }`,
    data: data,
    type: "POST",
    contentType: false,
    processData: false,
    success: function (res) {
      console.log("SUCCESS");
      let $container = $(".file-list");
      $container.find(".fa-stack").remove();
      $container.append(
        '<span class="fa-stack"><i style="color:#1EE049;" class="fas fa-circle fa-stack-2x"></i><i class="fas fa-check fa-xs fa-stack-1x fa-inverse"></i></span>'
      );
    },
    error: function (err) {
      console.log("ERROR");
      alert(JSON.stringify(err));
      let $container = $(".file-list");
      $container.find(".fa-stack").remove();
      $container.append(
        '<span class="fa-stack"><i style="color:#EB2121;" class="fas fa-circle fa-stack-2x"></i><i class="fas fa-times fa-xs fa-stack-1x fa-inverse"></i></span>'
      );
    },
  });
}
