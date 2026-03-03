(() => {
  const DRINKS = {
    'Espresso':     'Just espresso — concentrated and intense.',
    'Cortado':      'Balanced and small — roughly equal espresso and milk.',
    'Americano':    'Espresso + hot water — lighter body, same espresso character.',
    'Cappuccino':   'Equal thirds — espresso, steamed milk, and thick milk foam.',
    'Flat White':   'Espresso-forward milk drink — velvety, almost no foam.',
    'Latte':        'Espresso with lots of steamed milk and a thin foam cap.',
    'Mocha':        'A latte with chocolate — espresso, milk, and cocoa richness.',
    'Breve Latte':  'Latte-like but with cream — richer and denser.',
  };

  function recommend(q1, q2, q3) {
    if (q1 === 'strong' && q2 === 'none')   return 'Espresso';
    if (q1 === 'strong')                    return 'Cortado';
    if (q1 === 'medium' && q2 === 'none')   return 'Americano';
    if (q1 === 'medium' && q2 === 'little') return 'Cappuccino';
    if (q1 === 'medium')                    return 'Flat White';
    if (q2 === 'lots'   && q3 === 'choc')   return 'Mocha';
    if (q2 === 'lots'   && q3 === 'cream')  return 'Breve Latte';
    return 'Latte';
  }

  const answers = { q1: null, q2: null, q3: null };

  const steps    = Array.from(document.querySelectorAll('.quiz-step'));
  const dots     = Array.from(document.querySelectorAll('.quiz-progress__dot'));
  const result   = document.querySelector('.quiz-result');
  const quizChip = document.getElementById('quizChip');
  const quizName = document.getElementById('quizName');
  const quizDesc = document.getElementById('quizDesc');
  const quizCta  = document.getElementById('quizCta');
  const restartBtn = document.getElementById('quizRestart');

  if (!steps.length) return; // quiz section not on this page

  function showStep(n) {
    steps.forEach((s, i) => s.classList.toggle('active', i === n));
    dots.forEach((d, i) => d.classList.toggle('active', i === n));
    result.classList.remove('active');
  }

  function showResult() {
    steps.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    result.classList.add('active');

    const drink = recommend(answers.q1, answers.q2, answers.q3);
    quizChip.textContent = 'Your drink';
    quizName.textContent = drink;
    quizDesc.textContent = DRINKS[drink];
    quizCta.href = 'brew.html';
  }

  function reset() {
    answers.q1 = answers.q2 = answers.q3 = null;
    document.querySelectorAll('.quiz-option').forEach(btn => btn.classList.remove('selected'));
    showStep(0);
  }

  document.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const key  = btn.dataset.key;
      const val  = btn.dataset.val;
      const step = btn.closest('.quiz-step');

      // Mark selected within this step
      step.querySelectorAll('.quiz-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      answers[key] = val;

      const stepIndex = steps.indexOf(step);
      const next = stepIndex + 1;

      // Short delay so the selected state is visible before transitioning
      setTimeout(() => {
        if (next < steps.length) {
          showStep(next);
        } else {
          showResult();
        }
      }, 200);
    });
  });

  restartBtn.addEventListener('click', reset);

  // Initialise
  showStep(0);
})();
