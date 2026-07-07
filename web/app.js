(() => {
  "use strict";

  const STATUS_OPTIONS = ["待审核", "待制作", "已制作"];
  const STORAGE_KEY = "sph-content-workflow-state-v1";
  const rows = Array.isArray(window.SPH_CONTENT_ROWS) ? window.SPH_CONTENT_ROWS : [];

  const tableBody = document.querySelector("#contentRows");
  const completedTableBody = document.querySelector("#completedContentRows");
  const emptyState = document.querySelector("#emptyState");
  const completedEmptyState = document.querySelector("#completedEmptyState");
  const activeTableScroll = document.querySelector("#activeTableScroll");
  const completedTableScroll = document.querySelector("#completedTableScroll");
  const activeVisibleCount = document.querySelector("#activeVisibleCount");
  const completedVisibleCount = document.querySelector("#completedVisibleCount");
  const searchInput = document.querySelector("#searchInput");
  const statusFilter = document.querySelector("#statusFilter");
  const visibleCount = document.querySelector("#visibleCount");
  const totalCount = document.querySelector("#totalCount");
  const reviewCount = document.querySelector("#reviewCount");
  const makingCount = document.querySelector("#makingCount");
  const doneCount = document.querySelector("#doneCount");
  const dialog = document.querySelector("#contentDialog");
  const dialogTitle = document.querySelector("#dialogTitle");
  const dialogBook = document.querySelector("#dialogBook");
  const dialogContent = document.querySelector("#dialogContent");
  const dialogCopy = document.querySelector("#dialogCopy");
  const toast = document.querySelector("#toast");

  let dialogText = "";
  let toastTimer;

  const loadState = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  };

  const state = loadState();

  const saveState = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      showToast("浏览器未允许保存备注和状态");
    }
  };

  const ensureRowState = (row) => {
    if (!state[row.id]) {
      state[row.id] = {
        note: "",
        status: "待审核",
        videoLink: row.videoLink || "",
        oneLineIntro: row.oneLineIntro || ""
      };
    }
    if (!STATUS_OPTIONS.includes(state[row.id].status)) {
      state[row.id].status = "待审核";
    }
    if (typeof state[row.id].videoLink !== "string") {
      state[row.id].videoLink = row.videoLink || "";
    }
    if (typeof state[row.id].oneLineIntro !== "string") {
      state[row.id].oneLineIntro = row.oneLineIntro || "";
    }
    return state[row.id];
  };

  const showToast = (message) => {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 1800);
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.append(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    showToast("已复制");
  };

  const openDialog = (row, label, text) => {
    dialogText = text;
    dialogBook.textContent = `${row.bookTitle} · ${row.author}`;
    dialogTitle.textContent = label;
    dialogContent.textContent = text;
    dialog.showModal();
  };

  const createButton = (label, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  };

  const createReadonlyCell = (row, label, value, compact = false) => {
    const cell = document.createElement("td");
    const wrapper = document.createElement("div");
    const content = document.createElement("div");
    const actions = document.createElement("div");
    const text = value || "";

    wrapper.className = "readonly-cell";
    content.className = `readonly-content${compact ? " compact" : ""}`;
    content.textContent = text || "—";
    content.title = `${label}（只读）`;
    actions.className = "cell-actions";
    actions.append(
      createButton("复制", () => copyText(text)),
      createButton("查看", () => openDialog(row, label, text))
    );

    wrapper.append(content, actions);
    cell.append(wrapper);
    return cell;
  };

  const createIndexCell = (index) => {
    const cell = document.createElement("td");
    cell.className = "row-index";
    cell.textContent = String(index + 1);
    cell.setAttribute("aria-label", `第${index + 1}条稿件`);
    return cell;
  };

  const createNoteCell = (row) => {
    const cell = document.createElement("td");
    const input = document.createElement("textarea");
    const rowState = ensureRowState(row);

    input.className = "note-input";
    input.value = rowState.note;
    input.placeholder = "可填写审核意见、制作要求等";
    input.setAttribute("aria-label", `${row.bookTitle}的备注`);
    input.addEventListener("input", () => {
      rowState.note = input.value;
      saveState();
    });

    cell.append(input);
    return cell;
  };

  const createOneLineIntroCell = (row) => {
    const cell = document.createElement("td");
    const wrapper = document.createElement("div");
    const input = document.createElement("textarea");
    const actions = document.createElement("div");
    const rowState = ensureRowState(row);

    wrapper.className = "editable-text-cell";
    input.className = "one-line-input";
    input.value = rowState.oneLineIntro || row.oneLineIntro || "";
    input.placeholder = "写一句能吸引用户停留的话";
    input.setAttribute("aria-label", `${row.bookTitle}的一句话介绍`);
    input.addEventListener("input", () => {
      rowState.oneLineIntro = input.value;
      saveState();
    });

    actions.className = "cell-actions";
    actions.append(
      createButton("复制", () => copyText(input.value.trim())),
      createButton("查看", () => openDialog(row, "一句话介绍", input.value.trim()))
    );
    wrapper.append(input, actions);
    cell.append(wrapper);
    return cell;
  };

  const createVideoLinkCell = (row) => {
    const cell = document.createElement("td");
    const wrapper = document.createElement("div");
    const input = document.createElement("input");
    const actions = document.createElement("div");
    const rowState = ensureRowState(row);

    wrapper.className = "video-link-cell";
    input.type = "url";
    input.className = "video-link-input";
    input.value = rowState.videoLink;
    input.placeholder = "粘贴视频链接";
    input.setAttribute("aria-label", `${row.bookTitle}的视频链接`);
    input.addEventListener("input", () => {
      rowState.videoLink = input.value;
      saveState();
    });

    const openLink = () => {
      const value = input.value.trim();
      if (!value) {
        showToast("请先填写视频链接");
        return;
      }
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
        window.open(url.href, "_blank", "noopener,noreferrer");
      } catch {
        showToast("请输入有效的 http(s) 链接");
      }
    };

    actions.className = "cell-actions";
    actions.append(
      createButton("打开", openLink),
      createButton("复制", () => copyText(input.value.trim()))
    );
    wrapper.append(input, actions);
    cell.append(wrapper);
    return cell;
  };

  const createStatusCell = (row) => {
    const cell = document.createElement("td");
    const fieldset = document.createElement("fieldset");
    const rowState = ensureRowState(row);

    fieldset.className = "status-group";
    fieldset.setAttribute("aria-label", `${row.bookTitle}的制作状态`);

    STATUS_OPTIONS.forEach((status) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      const text = document.createElement("span");

      label.className = "status-option";
      input.type = "radio";
      input.name = `status-${row.id}`;
      input.value = status;
      input.checked = rowState.status === status;
      input.addEventListener("change", () => {
        rowState.status = status;
        saveState();
        renderRows();
        updateSummary();
        applyFilters();
      });
      text.textContent = status;
      label.append(input, text);
      fieldset.append(label);
    });

    cell.append(fieldset);
    return cell;
  };

  const createTableRow = (row, index) => {
    const tableRow = document.createElement("tr");
    tableRow.dataset.id = row.id;
    tableRow.append(
      createIndexCell(index),
      createReadonlyCell(row, "书名", row.bookTitle, true),
      createReadonlyCell(row, "作者", row.author, true),
      createReadonlyCell(row, "视频简介", row.videoDescription),
      createVideoLinkCell(row),
      createReadonlyCell(row, "原文", row.original),
      createReadonlyCell(row, "二创", row.rewritten),
      createReadonlyCell(row, "分段文案", row.segmented),
      createReadonlyCell(row, "生图提示词", row.imagePrompts),
      createOneLineIntroCell(row),
      createReadonlyCell(row, "字幕", row.subtitles),
      createNoteCell(row),
      createStatusCell(row)
    );
    return tableRow;
  };

  const renderRows = () => {
    tableBody.replaceChildren();
    completedTableBody.replaceChildren();
    let activeIndex = 0;
    let completedIndex = 0;

    rows.forEach((row, index) => {
      if (!row.id) row.id = `row-${index + 1}`;
      const rowState = ensureRowState(row);
      if (rowState.status === "已制作") {
        completedTableBody.append(createTableRow(row, completedIndex));
        completedIndex += 1;
      } else {
        tableBody.append(createTableRow(row, activeIndex));
        activeIndex += 1;
      }
    });
    saveState();
  };

  const updateSummary = () => {
    const counts = { 待审核: 0, 待制作: 0, 已制作: 0 };
    rows.forEach((row) => {
      counts[ensureRowState(row).status] += 1;
    });
    totalCount.textContent = String(rows.length);
    reviewCount.textContent = String(counts.待审核);
    makingCount.textContent = String(counts.待制作);
    doneCount.textContent = String(counts.已制作);
  };

  const applyFilters = () => {
    const query = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    let shown = 0;
    let activeShown = 0;
    let completedShown = 0;

    rows.forEach((row) => {
      const rowState = ensureRowState(row);
      const haystack =
        `${row.bookTitle} ${row.author} ${row.videoDescription} ${row.oneLineIntro || ""} ${rowState.oneLineIntro} ${rowState.videoLink}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const matchesStatus =
        selectedStatus === "all" || rowState.status === selectedStatus;
      const targetBody = rowState.status === "已制作" ? completedTableBody : tableBody;
      const tableRow = targetBody.querySelector(`[data-id="${CSS.escape(row.id)}"]`);
      const visible = matchesQuery && matchesStatus;
      tableRow.hidden = !visible;
      if (visible) {
        shown += 1;
        if (rowState.status === "已制作") {
          completedShown += 1;
        } else {
          activeShown += 1;
        }
      }
    });

    visibleCount.textContent = `当前显示 ${shown} 条`;
    activeVisibleCount.textContent = `${activeShown} 条`;
    completedVisibleCount.textContent = `${completedShown} 条`;
    emptyState.hidden = activeShown !== 0;
    activeTableScroll.hidden = activeShown === 0;
    completedEmptyState.hidden = completedShown !== 0;
    completedTableScroll.hidden = completedShown === 0;
  };

  searchInput.addEventListener("input", applyFilters);
  statusFilter.addEventListener("change", applyFilters);
  document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
  document.querySelector("#dialogCloseButton").addEventListener("click", () => dialog.close());
  dialogCopy.addEventListener("click", () => copyText(dialogText));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  renderRows();
  updateSummary();
  applyFilters();
})();
