/* ==========================================
   NEGOSYOUTH - GAME SCRIPT (Siomai, Day 1)
   Load this AFTER script.js:
   <script src="script.js"></script>
   <script src="game.js"></script>
========================================== */

/* ---------- BUSINESS SETTINGS ---------- */

const BUSINESSES = {
    siomai: {
        name: "Siomai",
        standCost: 2000,        // siomai stand
        startCapital: 10000,    // 10,000 - 2,000 stand - 1,000 inventory = 7,000 start money
        stockCost: 1000,        // cost of 100% inventory
        stockRevenue: 1500      // money if 100% inventory is sold at full price
    }
};

const START_MONEY_NOTE = true;
const REPAIR_AT = 35;   // at or below this shop health, a repair choice is added

/* ---------- ELEMENTS ---------- */

const stageBox = document.getElementById("gameScreen");
const choicesBox = document.getElementById("gameChoices");
const statsWrap = document.querySelector(".layout-stats");

// the HTML has 4 boxes, the game needs 5 (adds Shop Health)
while (statsWrap.querySelectorAll(".layout-box").length < 5) {
    const extra = document.createElement("div");
    extra.className = "layout-box";
    statsWrap.appendChild(extra);
}

const statBoxes = statsWrap.querySelectorAll(".layout-box");

/* ---------- STATE ---------- */

let game = null;   // current run
let gameKey = "";  // "user|business" so we only restart when it changes

function newGame(bizId) {
    const biz = BUSINESSES[bizId];

    const g = {
        bizId,
        biz,
        day: 1,
        step: 0,              // 0 morning, 1 afternoon, 2 night, 3 summary
        money: biz.startCapital - biz.standCost - biz.stockCost,
        inventory: 100,       // percent
        reputation: 0,        // stars 0 - 5
        health: 100,          // shop health %, goes down while selling
        startMoney: biz.startCapital - biz.standCost - biz.stockCost,
        startInventory: 100,
        soldPercent: 0,
        revenue: 0,
        spent: 0,
        startHealth: 100,
        startNetwork: 0,
        log: []               // choices made today
    };

    return g;
}

// Network = total value of stand + inventory + money
// (so it goes down whenever you spend money, e.g. repairs)
function networkValue() {
    const inventoryValue = game.inventory * costPerPercent();
    return Math.round(game.biz.standCost + inventoryValue + game.money);
}

/* ---------- HELPERS ---------- */

const peso = n => "₱" + Math.round(n).toLocaleString("en-PH");
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// 1% inventory = stockCost / 100 to buy, stockRevenue / 100 to sell
const costPerPercent = () => game.biz.stockCost / 100;      // 10
const pricePerPercent = () => game.biz.stockRevenue / 100;  // 15

// Reputation 0 = sales become very weak (not on opening day, nobody knows you yet)
function repMultiplier() {
    if (game.day === 1) return 1;
    if (game.reputation <= 0) return 0.3;
    return 1;
}

// Worn-out shop (low health) sells less
function healthMultiplier() {
    return game.health <= REPAIR_AT ? 0.7 : 1;
}

// Every time a selling choice is made, the shop loses 1 to 5% health
function wearShop(soldPercent) {
    if (soldPercent <= 0) return;
    game.health = clamp(game.health - rand(1, 5), 0, 100);
}

// Repair costs what the repaired part of the shop is worth
// (stand worth 2,000 -> 20 pesos per 1% health)
const costPerHealth = () => game.biz.standCost / 100;

function repairOption() {
    const need = 100 - game.health;
    const cost = Math.round(need * costPerHealth());

    return {
        label: `Repair the shop to 100% (${peso(cost)})`,
        needsMoney: true,
        run() {
            const unit = costPerHealth();
            const fix = Math.min(100 - game.health, Math.floor(game.money / unit));
            const total = Math.round(fix * unit);

            game.health += fix;
            game.money -= total;
            game.spent += total;
            return `You repaired the shop by ${fix}% for ${peso(total)}. Shop health is now ${Math.round(game.health)}%.`;
        }
    };
}

// Sell a random % of the stock. Returns what happened.
function doSales(minPct, maxPct, promo) {
    const wanted = Math.round(rand(minPct, maxPct) * repMultiplier() * healthMultiplier());
    const sold = Math.min(wanted, game.inventory);

    // Buy 5 get 1 = you only get paid for 5 out of every 6
    const price = pricePerPercent() * (promo ? 5 / 6 : 1);
    const earned = Math.round(sold * price);

    game.inventory -= sold;
    game.money += earned;
    game.soldPercent += sold;
    game.revenue += earned;
    wearShop(sold);

    return { sold, earned };
}

function addRep(amount) {
    game.reputation = clamp(Math.round((game.reputation + amount) * 100) / 100, 0, 5);
}

/* ---------- DAY 1 SCRIPT ---------- */

function getSteps() {
    return [

        /* ===== MORNING ===== */
        {
            time: "MORNING",
            title: "Opening Day",
            text: "Opening day! You don't have a reputation yet and nobody knows you.",
            options: [
                {
                    label: "Give out free samples",
                    needsStock: true,
                    sells: true,
                    run() {
                        const lost = Math.min(rand(15, 25), game.inventory);
                        game.inventory -= lost;
                        addRep(1);
                        return `You handed out free samples. You lost ${lost}% of your inventory, but a lot more people know you now!`;
                    }
                },
                {
                    label: "Promo: Buy 5 Get 1 (today only)",
                    needsStock: true,
                    sells: true,
                    run() {
                        const r = doSales(40, 60, true);
                        addRep(0.5);
                        return `Your promo worked! You sold ${r.sold}% of your inventory and earned ${peso(r.earned)}.`;
                    }
                },
                {
                    label: "Do nothing special, just sell",
                    needsStock: true,
                    sells: true,
                    run() {
                        const r = doSales(10, 20, false);
                        return `Sales were slow. You sold ${r.sold}% of your inventory and earned ${peso(r.earned)}.`;
                    }
                }
            ]
        },

        /* ===== AFTERNOON ===== */
        {
            time: "AFTERNOON",
            title: "Way Too Hot",
            text: "It's afternoon and the heat is unbearable. Hardly anyone is walking by.",
            options: [
                {
                    label: "Close now and re-open later tonight",
                    run() {
                        return "You took a break. No sales and no shop health lost.";
                    }
                },
                {
                    label: "Keep selling",
                    needsStock: true,
                    sells: true,
                    run() {
                        const r = doSales(20, 30, false);
                        return `You kept selling in the heat! You sold ${r.sold}% of your inventory and earned ${peso(r.earned)}.`;
                    }
                }
            ]
        },

        /* ===== NIGHT ===== */
        {
            time: "NIGHT",
            title: "Night time",
            text: () => game.inventory <= 0
                ? "You ran out of inventory!"
                : `It's night. You still have ${game.inventory}% inventory left.`,
            options: [
                {
                    label: "Sell the remaining inventory until it's gone",
                    needsStock: true,
                    sells: true,
                    run() {
                        const left = game.inventory;
                        const earned = Math.round(left * pricePerPercent());
                        game.inventory = 0;
                        game.money += earned;
                        game.soldPercent += left;
                        game.revenue += earned;
                        wearShop(left);
                        return `You sold out the remaining ${left}% and earned ${peso(earned)}.`;
                    }
                },
                {
                    label: "Close up and buy inventory (20% off)",
                    needsMoney: true,
                    needsRoom: true,
                    run() {
                        const need = 100 - game.inventory;
                        const unitCost = costPerPercent() * 0.8;
                        const canAfford = Math.floor(game.money / unitCost);
                        const buy = Math.min(need, canAfford);
                        const total = Math.round(buy * unitCost);

                        game.inventory += buy;
                        game.money -= total;
                        game.spent += total;
                        return `You bought ${buy}% inventory for ${peso(total)} (20% off).`;
                    }
                }
            ]
        }
    ];
}

/* ---------- WHY AN OPTION IS LOCKED ---------- */

function lockReason(opt) {
    if (opt.needsStock && game.inventory <= 0) return "No inventory";
    if (opt.sells && game.health <= 0) return "Stand is broken";
    if (opt.needsMoney && game.money <= 0) return "No money";
    if (opt.needsRoom && game.inventory >= 100) return "Inventory is full";
    return "";
}

/* ---------- STATS PANEL ---------- */

let statEls = null;

const reduceMotion = () =>
    window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

// Build the 5 stat boxes once, so changes can be animated
function buildStats() {
    const defs = [
        { label: "Money",       fmt: peso,                 unit: "money" },
        { label: "Inventory",   fmt: n => Math.round(n) + "%", unit: "pct", bar: true },
        { label: "Reputation",  stars: true,                unit: "stars" },
        { label: "Shop Health", fmt: n => Math.round(n) + "%", unit: "pct", bar: true },
        { label: "Network",     fmt: peso,                 unit: "money" }
    ];

    const STARS = "★★★★★";

    statEls = defs.map((d, i) => {
        const box = statBoxes[i];

        box.innerHTML =
            `<span class="stat-label">${d.label}</span>` +
            (d.stars
                ? `<span class="stars" role="img">
                       <span class="stars-bg">${STARS}</span>
                       <span class="stars-fg">${STARS}</span>
                   </span>`
                : `<span class="stat-value"></span>`) +
            (d.bar ? `<span class="stat-bar"><i></i></span>` : "");

        return {
            def: d,
            box,
            value: box.querySelector(".stat-value"),
            fill: box.querySelector(".stat-bar i"),
            starFg: box.querySelector(".stars-fg"),
            starWrap: box.querySelector(".stars"),
            target: null,   // where the number is going
            shown: null,    // what is on screen right now
            raf: 0
        };
    });
}

function floatText(def, delta) {
    const sign = delta > 0 ? "+" : "−";
    const n = Math.abs(delta);

    if (def.unit === "money") return sign + peso(n);
    if (def.unit === "stars") return sign + (Math.round(n * 100) / 100) + " ★";
    return sign + Math.round(n) + "%";
}

// Flash the box + a floating +/- number
function popStat(el, delta) {
    const up = delta > 0;

    el.box.classList.remove("stat-up", "stat-down");
    void el.box.offsetWidth;
    el.box.classList.add(up ? "stat-up" : "stat-down");

    const tag = document.createElement("span");
    tag.className = "stat-float " + (up ? "up" : "down");
    tag.textContent = floatText(el.def, delta);
    el.box.appendChild(tag);

    tag.addEventListener("animationend", () => tag.remove());
    setTimeout(() => el.box.classList.remove("stat-up", "stat-down"), 900);
}

// Count the number up/down smoothly
function tweenValue(el, to) {
    cancelAnimationFrame(el.raf);

    const from = el.shown;
    const start = performance.now();
    const time = 700;

    if (reduceMotion()) {
        el.shown = to;
        el.value.textContent = el.def.fmt(to);
        return;
    }

    const tick = now => {
        const t = Math.min(1, (now - start) / time);
        const ease = 1 - Math.pow(1 - t, 3);

        el.shown = from + (to - from) * ease;
        el.value.textContent = el.def.fmt(el.shown);

        if (t < 1) el.raf = requestAnimationFrame(tick);
    };

    el.raf = requestAnimationFrame(tick);
}

function setStat(el, target, barPct, barLow) {
    const first = el.target === null;
    const delta = first ? 0 : target - el.target;

    el.target = target;

    // number (or stars)
    if (el.def.stars) {
        // exact fill: 2.5 stars = 50% of the row
        el.starFg.style.width = clamp(target / 5 * 100, 0, 100) + "%";
        el.starWrap.setAttribute("aria-label", target + " out of 5 stars");
    } else if (first) {
        el.shown = target;
        el.value.textContent = el.def.fmt(target);
    } else if (delta !== 0) {
        tweenValue(el, target);
    }

    // bar
    if (el.fill) {
        el.fill.style.width = clamp(barPct, 0, 100) + "%";
        el.fill.classList.toggle("low", barLow);
    }

    if (delta !== 0) popStat(el, delta);
}

function renderStats() {
    if (!game || !statEls) return;

    setStat(statEls[0], game.money);
    setStat(statEls[1], game.inventory, game.inventory, game.inventory <= 20);
    setStat(statEls[2], game.reputation);
    setStat(statEls[3], game.health, game.health, game.health <= REPAIR_AT);
    setStat(statEls[4], networkValue());

    // Warnings: everything is connected
    statBoxes[0].classList.toggle("stat-danger", game.money <= 0);
    statBoxes[1].classList.toggle("stat-danger", game.inventory <= 0);
    statBoxes[2].classList.toggle("stat-danger", game.reputation <= 0 && game.day > 1);
    statBoxes[3].classList.toggle("stat-danger", game.health <= REPAIR_AT);
}

/* ---------- SCREEN OVERLAY (time of day) ---------- */

function setScene(label) {
    let tag = document.getElementById("sceneTag");

    if (!tag) {
        tag = document.createElement("div");
        tag.id = "sceneTag";
        tag.className = "scene-tag";
        stageBox.appendChild(tag);
    }

    tag.textContent = label;
}

/* ---------- CHOICES PANEL ---------- */

function showQuestion() {
    const steps = getSteps();
    const step = steps[game.step];

    setScene(`DAY ${game.day} • ${step.time}`);
    renderStats();

    const text = typeof step.text === "function" ? step.text() : step.text;

    // Shop is almost broken: a repair choice is added to every question
    const options = step.options.slice();
    if (game.health <= REPAIR_AT && game.health < 100) options.push(repairOption());

    const optionsHtml = options.map((opt, i) => {
        const reason = lockReason(opt);

        return `<button type="button" class="choice-btn" data-i="${i}" ${reason ? "disabled" : ""}>
                    <span class="choice-letter">${"ABCD"[i]}</span>
                    <span class="choice-text">${opt.label}${reason ? ` <em>(${reason})</em>` : ""}</span>
                </button>`;
    }).join("");

    choicesBox.innerHTML =
        `<div class="choices-ui">
            <p class="choice-title">${step.title}</p>
            <p class="choice-question">${text}</p>
            <div class="choice-list">${optionsHtml}</div>
        </div>`;

    // No possible move (no money AND no inventory)
    const anyOpen = options.some(opt => !lockReason(opt));

    if (!anyOpen) {
        choicesBox.querySelector(".choice-list").innerHTML =
            `<button type="button" class="choice-btn next" id="skipStep">
                <span class="choice-text">Nothing you can do right now… Continue</span>
            </button>`;

        document.getElementById("skipStep").addEventListener("click", () => {
            game.log.push({ time: step.time, choice: "Could do nothing" });
            advance();
        });

        return;
    }

    choicesBox.querySelectorAll(".choice-btn[data-i]").forEach(btn => {
        btn.addEventListener("click", () => {
            const opt = options[Number(btn.dataset.i)];
            const result = opt.run();

            game.log.push({ time: step.time, choice: opt.label });
            showResult(result);
        });
    });
}

/* ---------- RESULT POP-UP (shown after a choice) ---------- */

function removePopup() {
    const old = document.getElementById("resultPopup");
    if (old) old.remove();

    choicesBox.classList.remove("locked");
}

function showResult(message) {
    renderStats();
    removePopup();

    // the question stays visible but dimmed, so only the pop-up can be clicked
    choicesBox.classList.add("locked");

    const step = getSteps()[game.step];
    const lastStep = game.step >= 2;

    const pop = document.createElement("div");
    pop.id = "resultPopup";
    pop.className = "result-popup";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-live", "polite");

    pop.innerHTML =
        `<div class="result-card">
            <p class="result-time">DAY ${game.day} • ${step.time}</p>
            <p class="result-text">${message}</p>
            <button type="button" class="choice-btn next" id="nextStep">
                <span class="choice-text">${lastStep ? "SEE DAY 1 RESULT" : "CONTINUE"}</span>
            </button>
        </div>`;

    stageBox.appendChild(pop);

    const next = document.getElementById("nextStep");

    next.addEventListener("click", () => {
        removePopup();
        advance();
    });

    next.focus();
}

function advance() {
    game.step++;

    if (game.step >= 3) {
        showSummary();
    } else {
        showQuestion();
    }
}

/* ---------- DAY 1 TOTAL ---------- */

function showSummary() {
    renderStats();
    setScene(`DAY ${game.day} • RESULT`);

    // Profit = what you earned from sales minus what the sold inventory cost
    const profit = game.revenue - game.soldPercent * costPerPercent();
    const profitClass = profit >= 0 ? "good" : "bad";
    const profitSign = profit >= 0 ? "+" : "-";

    const picks = game.log
        .map(l => `<li><b>${l.time}:</b> ${l.choice}</li>`)
        .join("");

    let note = "";

    if (game.money <= 0 && game.inventory <= 0) {
        note = `<p class="sum-note bad">You have no money and no inventory left. Game over!</p>`;
    } else if (game.inventory <= 0) {
        note = `<p class="sum-note bad">You have no inventory for tomorrow, so you can't sell!</p>`;
    } else if (game.health <= 0) {
        note = `<p class="sum-note bad">Your stand is broken, so you can't sell anymore!</p>`;
    } else if (game.money <= 0) {
        note = `<p class="sum-note bad">You have no money, so you can't pick any upgrades.</p>`;
    }

    choicesBox.innerHTML =
        `<div class="choices-ui summary">
            <p class="choice-title">DAY ${game.day} TOTAL</p>

            <div class="sum-grid">
                <div><span>Money</span><b>${peso(game.startMoney)} → ${peso(game.money)}</b></div>
                <div><span>Profit</span><b class="${profitClass}">${profitSign}${peso(Math.abs(profit))}</b></div>
                <div><span>Sold</span><b>${Math.round(game.soldPercent)}% (${peso(game.revenue)})</b></div>
                <div><span>Inventory</span><b>${game.startInventory}% → ${Math.round(game.inventory)}%</b></div>
                <div><span>Reputation</span><b>${game.reputation.toFixed(2).replace(/\.?0+$/, "")} / 5 ★</b></div>
                <div><span>Shop Health</span><b>${game.startHealth}% → ${Math.round(game.health)}%</b></div>
                <div><span>Network</span><b>${peso(game.startNetwork)} → ${peso(networkValue())}</b></div>
            </div>

            ${note}

            <ul class="sum-picks">${picks}</ul>

            <div class="choice-list row">
                <button type="button" class="choice-btn next" id="replayDay">PLAY DAY 1 AGAIN</button>
            </div>
        </div>`;

    document.getElementById("replayDay").addEventListener("click", () => {
        startGame(game.bizId);
    });
}

/* ---------- START ---------- */

function startGame(bizId) {
    const biz = BUSINESSES[bizId];

    removePopup();

    if (!biz) {
        game = null;
        setScene("");
        choicesBox.innerHTML =
            `<div class="choices-ui"><p class="choice-question">Coming soon! Only Siomai is available for now. You can use "Change Business".</p></div>`;
        statBoxes.forEach(b => (b.innerHTML = ""));
        statEls = null;
        return;
    }

    game = newGame(bizId);
    game.startNetwork = networkValue();
    buildStats();

    // Intro: buying the stand
    renderStats();
    setScene("DAY 1 • START");

    choicesBox.innerHTML =
        `<div class="choices-ui">
            <p class="choice-title">${biz.name} Stand</p>
            <p class="choice-question">
                You bought a ${biz.name.toLowerCase()} stand for ${peso(biz.standCost)} and your first stock (100% inventory) for ${peso(biz.stockCost)}.<br>
                You start with ${peso(game.money)} in cash.
            </p>
            <div class="choice-list">
                <button type="button" class="choice-btn next" id="openShop">OPEN THE STAND</button>
            </div>
        </div>`;

    document.getElementById("openShop").addEventListener("click", showQuestion);
}

/* ---------- HOOK INTO script.js ---------- */
// script.js shows/hides #gameLayout. When it appears, start the game
// for the logged in player's chosen business.

function syncGame() {
    if (gameLayout.hidden) return;

    const user = getUser();
    if (!user || !user.business) return;

    const key = currentUser + "|" + user.business;

    if (key !== gameKey) {
        gameKey = key;
        startGame(user.business);
    }
}

new MutationObserver(() => {
    if (gameLayout.hidden) gameKey = ""; // reset when leaving the game
    syncGame();
}).observe(gameLayout, { attributes: true, attributeFilter: ["hidden"] });

syncGame();
