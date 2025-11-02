
//
// Local toggle handling
//
function setToggleUI(modeId, on) {
  const wrap  = document.getElementById(modeId + "-toggle");
  const box   = document.getElementById(modeId + "-checkbox");
  if (!wrap || !box) return;

  if (on) {
    wrap.classList.add("active");
    box.checked = true;
  } else {
    wrap.classList.remove("active");
    box.checked = false;
  }
}

function toggleFromId(mode) {
  const wrap = document.getElementById(mode + "-toggle");
  const isOn = wrap.classList.contains("active");
  const newState = !isOn;

  // immediate UI
  setToggleUI(mode, newState);

  // local persistence for now
  const states = JSON.parse(localStorage.getItem("modes") || "{}");
  states[mode] = newState;
  localStorage.setItem("modes", JSON.stringify(states));

  // backend call placeholder
  updateBackend(mode, newState);
}

//
// Restore UI on load
//
window.addEventListener("load", () => {
  const states = JSON.parse(localStorage.getItem("modes") || "{}");
  Object.entries(states).forEach(([mode, on]) => {
    setToggleUI(mode, on);
  });
});


//
// ✅ Backend hook — fill in later
//
async function updateBackend(mode, state) {
  /* 
  TODO — when backend live:
  await fetch("http://localhost:5000/update", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ mode, state })
  });
  */
}
