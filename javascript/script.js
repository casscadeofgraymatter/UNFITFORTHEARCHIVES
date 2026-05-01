/*
TABLE OF CONTENTS
  26   App bootstrap / `DOMContentLoaded`
  34   Page fade + internal navigation links
  74   Header nav behavior
  105  Intro redaction cycle: `randomizeRedaction()`
  183  Fact card flip accessibility
  212  Prison accordion
  231  Excerpt modal
  265  PDF embed modal
  297  Image gallery carousel
  340  Shared modal system + intro quiz
  413  Various modal content (About, Bibliography, Ethical Note)
  598  Learn Cards modal: `openLearnCardsModal()`
  718  Camp game: `openCampGame()`
  969  Books game: `openBooksGame()`
  1578 Empires game: `openEmpiresGame()`
  1945 Prison game: `openCaseFileModal()`
  2476 Tech game: `openTechGame()`
  3216 Archive game: `openArchiveGame()`
  3939 Global launcher wiring
*/

// Main bootstrap for this whole file:
// once the page is ready, wire up navigation, motion, modals, mini-games,
// accessibility behaviors, and  the interactive section experiences
	document.addEventListener('DOMContentLoaded', function(){
		const navButtons = document.querySelectorAll('.nav-button');
		const carousel = document.getElementById('carousel');


// Quick page fade-in so the UI doesn't feel like it just "pops" into existence.
// We set opacity to 0 first, then flip to 1 on the next paint frame for a smooth entry.
	document.body.style.opacity = '0';
	requestAnimationFrame(()=>{ document.body.style.opacity = '1'; });


// Smooth transition between internal pages:
// instead of jumping instantly, we fade out then navigate.
	document.querySelectorAll('a[href]').forEach(link=>{
		const href = link.getAttribute('href');
		
		// Skip links that should not get intercepted:
		// anchors and links meant for a new tab.
		if(href.startsWith('#') || link.target === '_blank') return;
		link.addEventListener('click', e=>{
			e.preventDefault();
			const dest = link.href;
			document.body.style.opacity = '0';
			setTimeout(()=> window.location = dest, 500);
		});
	});

	navButtons.forEach(btn => {
		btn.addEventListener('click', ()=>{
			const href = btn.getAttribute('data-href');
			if(href){
				window.location.href = href;
				return;
			}
			const targetId = btn.getAttribute('data-target');
			const target = document.getElementById(targetId);
			if(target && carousel){
				const left = target.offsetLeft - carousel.offsetLeft;
				carousel.scrollTo({left, behavior:'smooth'});
			}
		});
	});

// hovering the right side opens the menu, and leaving it closes after a tiny delay
	const headerRight = document.querySelector('.header-right');
	const hamburger = document.getElementById('hamburger');
	const navMenu = document.getElementById('navMenu');
	let navHideTimer = null;
	function showNav(){
		if(navMenu){
			navMenu.removeAttribute('aria-hidden');
			navMenu.style.display = 'flex';
		}
		if(hamburger) hamburger.setAttribute('aria-expanded','true');
	}
	function hideNav(){
		if(navMenu){
			navMenu.setAttribute('aria-hidden','true');
			navMenu.style.display = 'none';
		}
		if(hamburger) hamburger.setAttribute('aria-expanded','false');
	}
	if(headerRight){
		headerRight.addEventListener('mouseenter', ()=>{
			clearTimeout(navHideTimer);
			showNav();
		});
		headerRight.addEventListener('mouseleave', ()=>{
			navHideTimer = setTimeout(hideNav, 200);
		});
	}

//  randomly redact words to create that "partial memory / missing record" vibe
// Readers can still follow each sentence because we ensure at least one word remains visible
// On section pages, the pattern now re-randomizes after the auto-reveal finishes
// https://stackoverflow.com/questions/28615544/how-can-i-create-spoiler-text
	(function randomizeRedaction(){
		const intro = document.querySelector('.intro-lead');
		if(!intro) return;
		const words = Array.from(intro.querySelectorAll('.word'));
		if(!words.length) return;

		//  process sentence-by-sentence 
		let sentenceGroups = [];
		let current = [];
		words.forEach(w => {
			current.push(w);
			if(/\.$/.test(w.textContent.trim())){
				sentenceGroups.push(current);
				current = [];
			}
		});
		if(current.length) sentenceGroups.push(current);

		const isSectionPage = !!document.querySelector('.fact-cards');
		const isIndexPage = !!document.querySelector('.start-button');
		const shouldAutoReveal = isSectionPage || isIndexPage || window.matchMedia('(hover: none), (pointer: coarse)').matches;

		function resetWords(){
			words.forEach(word => word.classList.remove('redact', 'auto-reveal'));
		}

		function applyRandomPattern(){
			resetWords();
			sentenceGroups.forEach(group=>{
				let redactedCount = 0;
				group.forEach(w=>{
					if(Math.random() < 0.6){
						w.classList.add('redact');
						redactedCount++;
					}
				});
				// never let a full sentence become unreadable.
				if(redactedCount === group.length && group.length){
					const idx = Math.floor(Math.random()*group.length);
					group[idx].classList.remove('redact');
				}
			});
		}

		function runRedactionCycle(){
			applyRandomPattern();
			if(!shouldAutoReveal) return;

			const redactedWords = words.filter(word => word.classList.contains('redact'));
			const initialDelay = 5000;
			const revealStepMs = 650;
			const holdVisibleMs = 2200;

			if(!redactedWords.length){
				setTimeout(runRedactionCycle, 4000);
				return;
			}

			setTimeout(()=>{
				redactedWords.forEach((word, idx)=>{
					setTimeout(()=> word.classList.add('auto-reveal'), idx * revealStepMs);
				});
			}, initialDelay);

			setTimeout(
				runRedactionCycle,
				initialDelay + (redactedWords.length * revealStepMs) + holdVisibleMs
			);
		}

		runRedactionCycle();
	})();

	(function setupFactCardFlipAccessibility(){
		const factCards = document.querySelectorAll('.fact-card');
		if(!factCards.length) return;

		const toggleCard = (card)=>{
			const isFlipped = card.classList.toggle('is-flipped');
			card.setAttribute('aria-pressed', isFlipped ? 'true' : 'false');
		};

		factCards.forEach(card=>{
			card.setAttribute('role', 'button');
			card.setAttribute('aria-pressed', 'false');
			if(!card.hasAttribute('tabindex')) card.tabIndex = 0;

			card.addEventListener('click', (e)=>{
				if(e.target.closest('a, button, input, textarea, select, summary')) return;
				toggleCard(card);
			});

			card.addEventListener('keydown', (e)=>{
				if(e.key === 'Enter' || e.key === ' '){
					e.preventDefault();
					toggleCard(card);
				}
			});
		});
	})();


// Prison page accordion behavior:
// only one details panel stays open at a time 
	(function setupAccordion(){
		const details = document.querySelectorAll('details[id$="-details"]');
		
		details.forEach(detail => {
			detail.addEventListener('toggle', function() {
				if (this.open) {
					// Auto-close siblings so readers focus on one expanded section.
					details.forEach(d => {
						if (d !== this) {
							d.open = false;
						}
					});
				}
			});
		});
	})();

// Excerpt modal:
// clicking a thumbnail opens a larger preview and optional transcription toggle.
	(function setupExcerptModal(){
		document.querySelectorAll('.excerpt-thumb').forEach(img=>{
			img.addEventListener('click', ()=>{
				const title = img.dataset.title || 'Excerpt';
				const transcription = img.dataset.trans || '';
				// Layout: image on the left, transcription tools on the right.
				let html = `
				<div style="display:flex; gap:20px; align-items:flex-start;">
				  <div style="width:600px; height:400px; overflow:hidden; flex-shrink:0;">
				    <img src="${img.src}" alt="Excerpt image" style="width:100%; height:100%; object-fit:contain;">
				  </div>
				  <div>`;
				if(transcription){
					html += `<button id="modal-trans-btn" class="transcription-button" style="margin-top:-10px;">View Transcription</button><div id="modal-trans" class="transcription hidden">${transcription}</div>`;
				}
				html += `
				  </div>
				</div>`;
				openModal(title, html);

				setTimeout(()=>{
					const btn = document.getElementById('modal-trans-btn');
					const transEl = document.getElementById('modal-trans');
					if(btn && transEl){
						btn.addEventListener('click', ()=> transEl.classList.toggle('hidden'));
					}
				}, 0);
			});
		});
	})();

	(function setupPdfEmbedModal(){
		document.querySelectorAll('.pdf-open-trigger').forEach(btn=>{
			btn.addEventListener('click', ()=>{
				const title = btn.dataset.title || 'Document';
				const sourceLabel = btn.dataset.sourceLabel;
				const sourceUrl = btn.dataset.sourceUrl;
				const pdfSrc = btn.dataset.pdf;
				if(!pdfSrc){
					openModal(title, '<p>PDF not available yet.</p>');
					return;
				}
				const html = `
					<div class="pdf-modal-content">
						<iframe src="${pdfSrc}" title="${title}" class="pdf-embed-frame"></iframe>
						<p><a href="${pdfSrc}" target="_blank" rel="noopener">Open PDF in new tab</a></p>
					</div>`;
				openModal(title, html);
				if(sourceLabel && sourceUrl && modalTitle){
					const sourceAnchor = document.createElement('a');
					sourceAnchor.href = sourceUrl;
					sourceAnchor.target = '_blank';
					sourceAnchor.rel = 'noopener';
					sourceAnchor.textContent = sourceLabel;
					sourceAnchor.style.marginLeft = '8px';
					sourceAnchor.style.fontSize = '0.9rem';
					sourceAnchor.style.fontWeight = '400';
					modalTitle.appendChild(sourceAnchor);
				}
			});
		});
	})();

//  gallery carousel:
// cycles images automatically, supports prev/next controls,
// and pauses while the user is hovering 
	(function setupImageGallery(){
		const gallery = document.querySelector('.image-gallery');
		if(!gallery) return;
		const images = Array.from(gallery.querySelectorAll('img'));
		if(images.length === 0) return;
		let currentIndex = 0;
		const showIndex = (index) => {
			images.forEach((img, idx) => img.classList.toggle('active', idx === index));
		};
		showIndex(currentIndex);

		const prev = document.createElement('button');
		prev.className = 'carousel-control prev';
		prev.type = 'button';
		prev.textContent = '‹';
		const next = document.createElement('button');
		next.className = 'carousel-control next';
		next.type = 'button';
		next.textContent = '›';
		gallery.append(prev, next);

		const step = (dir) => {
			currentIndex = (currentIndex + dir + images.length) % images.length;
			showIndex(currentIndex);
		};

		let cycleTimer = setInterval(() => step(1), 3000);
		const resetTimer = () => {
			clearInterval(cycleTimer);
			cycleTimer = setInterval(() => step(1), 3000);
		};

		prev.addEventListener('click', () => { step(-1); resetTimer(); });
		next.addEventListener('click', () => { step(1); resetTimer(); });

		gallery.addEventListener('mouseenter', () => clearInterval(cycleTimer));
		gallery.addEventListener('mouseleave', () => resetTimer());
	})();

// Shared footer modal system:
// this powers About/Bibliography/Ethical Note and other reusable modal content.
// https://stackoverflow.com/questions/77604055/modals-using-html-and-javascript
	const footerLinks = document.querySelectorAll('.footer-link');
	const modalOverlay = document.getElementById('modalOverlay');
	const modalBody = document.getElementById('modalBody');
	const modalTitle = document.getElementById('modalTitle');
	const modalClose = modalOverlay ? modalOverlay.querySelector('.modal-close') : null;

	function openModal(title, html){
		if(!modalOverlay) return;
		modalTitle.textContent = title || 'Info';
		modalBody.innerHTML = html || '<p>Placeholder content.</p>';
		modalOverlay.classList.remove('hidden');
		modalOverlay.setAttribute('aria-hidden','false');
		// Reset opacity so a previously closed modal doesn't reopen half-faded.
		modalOverlay.style.opacity = '1';
	}
	function closeModal(){
		if(!modalOverlay) return;
		// Fade out first, then hide 
		modalOverlay.style.opacity = '0';
		setTimeout(()=>{
			modalOverlay.classList.add('hidden');
			modalOverlay.setAttribute('aria-hidden','true');
		}, 600);
	}

	const modalContent = {
		'about': {
			title: 'About',
			html: `<p>Unfit for the Archives is a 2026 Digital Narrative and Interactive Design (DNID) Capstone project created by Cassandra Gray. This interactive digital platform reimagines what an archive can be, investigating how institutional systems, technology, and design shape cultural memory.</p>
				<p>Rather than treating archives as neutral storehouses of truth, this project explores how institutions, like prisons, camps, empires, books, and technological systems, determine what is remembered, legitimized, and erased from historical record.</p>
				<p>The project centers voices and histories that institutional systems have deemed "unfit," highlighting care, rehabilitation, and responsibility in archival practice.</p>`
		},
		'bibliography': {
			title: 'Bibliography',
			html: `<p><strong>Inspired by:</strong></p>
				<ul style="margin-left: 20px;">
					<li><a href="https://artsandculture.google.com/experiment/the-timbuktu-manuscripts/BQE6pL2U3Qsu2A?hl=en" target="_blank">The Timbuktu Manuscripts</a>: Google Arts & Culture.</li>
				</ul>

				<p><strong>Primary Sources:</strong></p>
				<ul style="margin-left: 20px;">
					<li><a href="https://monoskop.org/images/4/43/Foucault_Michel_Discipline_and_Punish_The_Birth_of_the_Prison_1977_1995.pdf" target="_blank">Foucault, M.</a> (1995). Discipline and Punish: The Birth of the Prison.</li>
					<li><a href="https://www.academia.edu/63649248/Regimes_of_Historicity" target="_blank">Hartog, F.</a> (2015). Regimes of Historicity: Presentism and Experiences of Time.</li>
				</ul>
				
				<p><strong>Prison Section Sources:</strong></p>
				<ul style="margin-left: 20px;">
					<li><a href="https://www.themarshallproject.org/2024/12/16/prison-penpal-jail-letters-mail" target="_blank">The Marshall Project</a> (2024). What I Learned From a Year of Reading Letters From Prisoners</li>
					<li><a href="https://www.keepbelieving.com/maybe-the-best-prisoner-letter-weve-ever-receive/" target="_blank">Keep Believing Ministries</a> (2023). Maybe the Best Prisoner Letter We’ve Ever Received</li>
					<li><a href="https://www.theplanjournal.com/article/prison-architecture-and-social-growth-prison-active-component-contemporary-city" target="_blank">Vessella, L.</a> (2017). Prison Architecture and Social Growth: Prison as an Active Component of the Contemporary City.</li>
					<li><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12908275/" target="_blank">Giné-Garriga , M. et al.</a> (2026). The Psychological Impact of Incarceration and Implications for Post-Prison Adjustment.</li>
					<li><a href="https://medium.com/@jiangemi/correctional-facilities-design-and-punishment-8608c461a5b6" target="_blank">Jiang, E.</a> (2023). Correctional Facilities: Design and Punishment.</li>
					<li><a href="https://aspe.hhs.gov/reports/psychological-impact-incarceration-implications-post-prison-adjustment-0" target="_blank">U.S. Department of Health and Human Services</a> (2001). Psychological Impact of Incarceration: Implications for Post-Prison Adjustment.</li>
					
				</ul>
				 <p><strong>Camp Section Sources:</strong></p>
				<ul style="margin-left: 20px;">
					<li><a href="https://scholarlycommons.law.case.edu/cgi/viewcontent.cgi?article=2632&context=jil" target="_blank">Wolfendale, J.</a> (2022). The Erasure of Torture in America.</li>
					<li><a href="https://news.columbia.edu/news/refugee-camp-complex-web-history-architecture-and-politics" target="_blank">Glasberg, E.</a> (2024). A Refugee Camp is a Complex Web of History, Architecture, and Politics.</li>
					<li><a href="https://encyclopedia.ushmm.org/content/en/article/classification-system-in-nazi-concentration-camps#:~:text=The%20Nazis%20used%20a%20marking%20system%20to,Gay%20men%20and%20men%20accused%20of%20homosexuality" target="_blank">Holocaust Encyclopedia</a> (2026). Classification System in Nazi Concentration Camps</li>
					<li><a href="https://www.iwm.org.uk/history/what-life-was-like-for-pows-in-east-asia-during-the-second-world-war" target="_blank">Imperial War Museums</a> (2023). What Life Was Like For POWs In East Asia During The Second World War.</li>
					<li><a href="https://www.nature.com/articles/s44271-024-00125-1" target="_blank">Bluic, A. et al.</a> (2023). A theoretical framework for polarization as the gradual fragmentation of a divided society.</li>
					<li><a href="https://encyclopedia.ushmm.org/content/en/photo/public-humiliation-for-alleged-race-defilement" target="_blank">Holocaust Encyclopedia</a> (1993). Public humiliation for alleged "race defilement".</li>
				</ul>

				<p><strong>Empire Section Sources:</strong></p>
				<ul style="margin-left: 20px;">
					<li><a href="https://construcciondeidentidades.wordpress.com/wp-content/uploads/2014/11/giorgio_agamben-homo_sacer__sovereign_power_and_bare_life__-stanford_university_press1998.pdf" target="_blank">Agamben, G.</a> (1998). Homo Sacer: Sovereign Power and Bare Life.</li>
					<li><a href="https://monoskop.org/images/1/13/Foucault_Michel_Language_Counter-Memory_Practice_Selected_Essays_and_Interviews_1977.pdf" target="_blank">Foucault, M.</a> (1977). Language, Counter-Memory, Practice: Selected Essays and Interviews</li>
					<li><a href="https://monoskop.org/images/6/6b/Fanon_Frantz_The_Wretched_of_the_Earth_1963.pdf" target="_blank">Fanon, F.</a> (1961). The Wretched of the Earth.</li>
					<li><a href="https://glc.yale.edu/sites/default/files/pdf/capatlism_and_slavery.pdf">Williams, E. </a>(1944). Capitalism and Slavery.</li>
					<li><a href="https://www.humanities.uci.edu/sites/default/files/document/Wellek_Readings_Ngugi_Quest_for_Relevance.pdf">Ngugi wa Thiong'o, N. </a>(1986). Decolonising the Mind.</li>
					<li><a href="https://nationalismstudies.org/wp-content/uploads/2021/03/Imagined-Communities-Reflections-on-the-Origin-and-Spread-of-Nationalism-by-Benedict-Anderson-z-lib.org_.pdf">Anderson, B. (1983). </a>Imagined Communities.</li>
					<li><a href="https://historyguild.org/the-berlin-conference/?srsltid=AfmBOoqlRn5RPhmsjK21eMI4OzRVufjojCeFM7vY3I4ASNyd8_wPbuAn">Berlin Conference Map</a> (1884-1885): Scramble for Africa.</a></li>
					<li><a href="https://blackpast.org/global-african-history/patrice-lumumbas-letter-pauline-lumumba-1960/" target="_blank">Lumumba, P.</a> (1960). Last Letter to Pauline Lumumba.</li>
				</ul>

				<p><strong>Book Section Sources:</strong></p>
				<ul style="margin-left: 20px;">
					<li><a href="https://monoskop.org/images/4/43/Foucault_Michel_Discipline_and_Punish_The_Birth_of_the_Prison_1977_1995.pdf" target="_blank">Foucault, M.</a> (1995). Discipline and Punish: The Birth of the Prison.</li>
					<li><a href="https://archive.org/details/case_wing_z1020_i39_1664/page/n7/mode/1up" target="_blank">Index Librorum Prohibitorum</a> (1559-1966).</li>
					<li><a href="https://www.nationalbook.org/books/stamped-from-the-beginning-the-definitive-history-of-racist-ideas-in-america/" target="_blank">Kendi, I.X.</a> (2016). Stamped from the Beginning.</li>
					<li><a href="https://ia803200.us.archive.org/11/items/SC_10041/%5BStudyCrux.com%5D%20George%20Orwell%20-%20Why%20I%20Write.pdf" target="_blank">Orwell, G.</a> (1946). Why I Write.</li>
					<li><a href="https://www.topshelfcomix.com/catalog/george-takei-they-called-us-enemy/1011" target="_blank">Takei, G.</a> (2019). They Called Us Enemy.</li>
					<li><a href="https://www.goodreads.com/book/show/6792458-the-new-jim-crow" target="_blank">Alexander, M.</a> (2010). The New Jim Crow.</li>
					<li><a href="https://www.antoniocasella.eu/nume/Grinage_Alexander_2012.pdf" target="_blank">Douglass, F.</a> (1845). Narrative of the Life of Frederick Douglass.</li>
					<li><a href="https://www.ala.org/sites/default/files/2025-04/state-of-americas-libraries-report-2025-WEB.pdf" target="_blank">American Library Association</a> (2025). State of America's Libraries Report 2025.</li>
				</ul>

				<p><strong>Technological Systems Section Sources:</strong></p>
				<ul style="margin-left: 20px;">
					<li><a href="https://www.theguardian.com/technology/2023/aug/02/ai-chatbot-training-human-toll-content-moderator-meta-openai" target="_blank">The Guardian</a> (2023). Kenyan moderators decry toll of training of AI models.</li>
					<li><a href="https://www.jstor.org/stable/j.ctt1pwt9w5" target="_blank">Noble, S.U.</a> (2018). Algorithms of Oppression.</li>
					<li><a href="https://www.propublica.org/article/machine-bias-risk-assessments-in-criminal-sentencing" target="_blank">ProPublica</a> (2016). Machine Bias investigation on COMPAS risk scores.</li>
					<li><a href="https://youtu.be/Wzssyn0L5I8?si=HENI4BxM7I7Edwfe" target="_blank">Eubanks, V.</a> (2018). Automating Inequality.</li>
					<li><a href="https://shoshanazuboff.com/book/" target="_blank">Zuboff, S.</a> (2019). The Age of Surveillance Capitalism.</li>
					<li><a href="https://aas.princeton.edu/publications/research/race-after-technology-abolitionist-tools-new-jim-code" target="_blank">Benjamin, R.</a> (2019). Race After Technology.</li>
					<li><a href="https://proceedings.mlr.press/v81/buolamwini18a/buolamwini18a.pdf" target="_blank">Buolamwini, J. & Gebru, T.</a> (2018). Gender Shades.</li>
					<li><a href="https://www.theguardian.com/books/2016/dec/26/the-attention-merchants-tim-wu-review" target="_blank">Wu, T.</a> (2016). The Attention Merchants.</li>
					<li><a href="https://mediax.stanford.edu/research-projects/scs-fogg/" target="_blank">Fogg, B.J.</a> (2003). Persuasive Technology.</li>
				</ul>

				<p><strong>Archive Section Sources:</strong></p>
				<ul style="margin-left: 20px;">
					<li><a href="https://monoskop.org/images/9/99/Derrida_Jacques_1995_Archive_Fever_A_Freudian_Impression.pdf" target="_blank">Derrida, J.</a> (1996). Archive Fever: A Freudian Impression.</li>
					<li><a href="https://www.academia.edu/5550408/Cultivating_archives_meanings_and_identities" target="_blank">Ketelaar, E.</a> (2017). Cultivating Archives: Meanings and Identities.</li>
					<li><a href="https://www.metaglyfix.com/jbs/pprs/SchwartzCook-Archives.pdf" target="_blank">Schwartz, J.M. & Cook, T.</a> (2002). Archives, Records, and Power: The Making of Modern Memory</li>
					<li> Caswell M. (2002). Dusting for Fingerprints: Introducing Feminist Standpoint Appraisal</li>
					<li> Christen K. & Anderson J. (2002). Toward Slow Archives</li>
					<li> Stoler A.(2002). Colonial Archives and the Arts of Governance</li>



				</ul>`
		},
		'ethical': {
			title: 'Ethical Note',
			html: `<p>This project engages with sensitive historical and contemporary topics including institutional violence, detention, colonialism, and systemic inequality. The work is presented with care and respect for those affected by these systems.</p>
				   <p>Archives themselves are complicit in systems of power and exclusion. This project does not claim to "give voice" to the silenced, but rather to examine how archival practices have historically marginalized certain communities and narratives.</p>`
		}
	};

	footerLinks.forEach(btn => btn.addEventListener('click', ()=>{
		const key = btn.getAttribute('data-modal') || btn.textContent;
		const content = modalContent[key] || { title: btn.textContent, html: '<p>Content not available.</p>' };
		openModal(content.title, content.html);
	}));
	if(modalClose) modalClose.addEventListener('click', closeModal);
	if(modalOverlay) modalOverlay.addEventListener('click', (e)=>{ if(e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeModal(); });

// Learn Cards :
// "swipe through facts" modal used across sections
// full card library, grouped by theme
const learnCardsData = {
	sections: [
		{
			id: 'prisons',
			label: 'Prisons',
			catClass: 'cat-prisons',
			cards: [
				{ stat: '2.1M', headline: 'The United States incarcerates more people than any nation on Earth.', detail: 'With roughly 4% of the world\'s population, the US holds more than 20% of the world\'s incarcerated population. This includes people in federal prisons, state prisons, local jails, immigration detention, juvenile facilities, and other forms of confinement.', source: 'Prison Policy Initiative, 2023' },
				{ stat: '500%', headline: 'The US prison population grew by 500% between 1970 and 2008.', detail: 'This explosion was not driven by a rise in crime, crime rates were largely stable or falling through much of this period. It was driven by policy: mandatory minimum sentences, the war on drugs, truth-in-sentencing laws, and the expansion of criminalized behaviors.', source: 'The Sentencing Project, 2021' },
				{ stat: '$39K', headline: 'The average cost to incarcerate one person in the US is $39,158 per year.', detail: 'In states like New York and California, that figure exceeds $60,000, more than most four-year college tuitions. Meanwhile, spending on education, mental health, and housing,  which research shows reduces crime, has been cut in many of the same states.', source: 'Vera Institute of Justice, 2022' },
				{ stat: '44%', headline: 'Nearly half of all people released from prison are rearrested within a year.', detail: 'Recidivism is often cited as evidence that individuals fail to reform. Researchers argue the opposite: it reflects a failure of re-entry systems. People leave prison without jobs, housing, ID, or healthcare, and face legal barriers to housing assistance, employment, and education.', source: 'Bureau of Justice Statistics, 2018' },
				{ stat: '1 in 3', headline: 'One in three Black men will be incarcerated at some point in their lifetime.', detail: 'For white men, that figure is 1 in 17. The racial disparity in incarceration rates cannot be explained by differences in crime rates alone, research consistently shows that Black Americans receive longer sentences, are offered fewer plea deals, and are policed more heavily in divested communities.', source: 'The Sentencing Project, 2020' },
				{ stat: '70%', headline: '70% of people in US jails have not been convicted of any crime.', detail: 'Most are there because they cannot afford bail. Pretrial detention means people lose jobs, housing, and custody of children while legally innocent. Studies show it also increases the likelihood of a guilty plea and a longer sentence.', source: 'Prison Policy Initiative, 2022' },
				{ stat: '64%', headline: 'Nearly two-thirds of people in local jails have a mental health condition.', detail: 'Jails have become the largest mental health providers in the United States by default, not design. Most offer minimal psychiatric services. Many people cycle in and out of custody repeatedly for behaviors directly connected to untreated illness.', source: 'Bureau of Justice Statistics / NAMI, 2021' },
				{ stat: '80K', headline: 'Solitary confinement is used on approximately 80,000 people on any given day.', detail: 'Solitary, 22 to 24 hours per day in a cell with little or no human contact, is classified by the UN as torture when used for more than 15 days. The US uses it routinely, sometimes for months or years, and disproportionately against people with mental illness, LGBTQ+ people, and people of color.', source: 'American Civil Liberties Union, 2022' }
			]
		},
		{
			id: 'camps',
			label: 'Camps',
			catClass: 'cat-camps',
			cards: [
				{ stat: null, headline: 'Concentration camps are a distinctly modern phenomenon, emerging in the late 19th century.', detail: 'The term does not exclusively refer to Nazi camps, historians use it to describe any government system of mass extrajudicial detention based on group identity rather than individual crime. The Spanish in Cuba (1896), the British in South Africa (1900), and the US with Japanese Americans (1942) all operated what historians classify as concentration camps.', source: 'Andrea Pitzer, One Long Night, 2017' },
				{ stat: '120K', headline: '120,000 Japanese Americans were forcibly incarcerated by the US government during World War II.', detail: 'Executive Order 9066 authorized the removal of Japanese Americans from the West Coast. Two-thirds were US citizens. No individual charges were filed. Most lost homes, businesses, and property. The Supreme Court upheld the order in Korematsu v. United States (1944), a decision not formally repudiated until 2018.', source: 'National Archives / Densho Encyclopedia' },
				{ stat: null, headline: 'The British operated concentration camps during the Second Boer War, where over 26,000 people died.', detail: 'Between 1900 and 1902, the British military interned Boer civilians, primarily women and children, in camps with inadequate food and sanitation. Mortality rates reached 34% in some camps. Emily Hobhouse\'s reports from inside the camps forced a public reckoning in Britain.', source: 'Elizabeth van Heyningen, The Concentration Camps of the Anglo-Boer War, 2013' },
				{ stat: '6', headline: 'The Nazi regime operated six dedicated extermination camps, distinct from the broader camp system.', detail: 'The broader Nazi system comprised over 1,000 camps of various types. The six extermination camps, Auschwitz-Birkenau, Treblinka, Sobibor, Belzec, Chelmno, and Majdanek, were designed specifically for systematic mass killing.', source: 'United States Holocaust Memorial Museum' },
				{ stat: null, headline: 'The United States currently operates immigration detention facilities that researchers have compared to earlier camp systems.', detail: 'As of 2023, ICE detains approximately 30,000 people per day in over 200 facilities. Detained individuals have not been charged with crimes, immigration violations are civil, not criminal. Human rights organizations have documented inadequate medical care, solitary confinement, and deaths in custody.', source: 'ACLU / Human Rights Watch, 2022-2023' },
				{ stat: '$200', headline: 'Private prison companies profit approximately $200 per detainee per day from immigration detention contracts.', detail: 'Companies like GEO Group and CoreCivic hold federal contracts worth billions annually. Critics argue the profit motive creates incentives to increase detention populations and reduce conditions costs. Both companies have lobbied for stricter immigration enforcement policies.', source: 'In the Public Interest, 2021' },
				{ stat: null, headline: 'China\'s detention of Uyghur Muslims in Xinjiang, estimated at over 1 million people, has been described by multiple governments as a system of internment camps.', detail: 'The Chinese government describes the facilities as "vocational training centers." Former detainees, leaked documents, and satellite imagery describe a system of mass detention without trial, forced political education, and labor transfer. Multiple governments have formally characterized it as crimes against humanity.', source: 'UN Human Rights Office report, 2022' }
			]
		},
		{
			id: 'empires',
			label: 'Empires',
			catClass: 'cat-empires',
			cards: [
				{ stat: null, headline: 'Empire refers to a political structure in which one state controls territory and people beyond its own borders, often through force.', detail: 'The British Empire, at its peak, controlled roughly a quarter of the world\'s land and population. Colonial empires fundamentally shaped current global inequality, borders, legal systems, languages, and patterns of migration, including the populations most affected by incarceration today.', source: 'Priya Satia, Time\'s Monster, 2020' },
				{ stat: '84%', headline: 'By 1914, European empires controlled 84% of the Earth\'s land surface.', detail: 'This was achieved through military conquest, forced treaty-making, and the systematic dismantling of existing political structures. Colonial governance frequently relied on incarceration, forced labor, and surveillance to manage subject populations, systems that in some cases directly prefigure modern carceral infrastructure.', source: 'Odd Arne Westad, The Global Cold War, 2005' },
				{ stat: null, headline: 'Colonial powers routinely used prisons as tools of political control, not just criminal punishment.', detail: 'In British India, French Algeria, Belgian Congo, and across colonial Africa, jails were used to detain political dissidents and suppress resistance to colonial rule. Many anticolonial leaders, including Gandhi, Nehru, Mandela, and Nkrumah, spent years in colonial prisons. These systems shaped the prison infrastructure inherited by postcolonial states.', source: 'Frantz Fanon, The Wretched of the Earth, 1961' },
				{ stat: '10M', headline: 'An estimated 10 million people died in the Congo Free State under Belgian King Leopold II\'s personal rule.', detail: 'Leopold\'s Congo (1885-1908) was operated as a private extraction colony. Workers who failed to meet rubber quotas were mutilated, killed, or had family members held hostage. The system relied on systematic terror and was eventually exposed through the journalism of Edmund Morel and the diplomatic reports of Roger Casement.', source: 'Adam Hochschild, King Leopold\'s Ghost, 1998' },
				{ stat: null, headline: 'Reparations for colonial violence and slavery remain largely unpaid.', detail: 'Haiti paid reparations to France for 122 years, not France paying Haiti for slavery, but Haiti compensating French slaveholders for their "lost property." The debt, totaling an estimated $21 billion in modern terms, was not fully paid off until 1947. Research shows this debt significantly stunted Haiti\'s economic development.', source: 'NYT, The Ransom, 2022' },
				{ stat: null, headline: 'The legacies of colonial border-drawing continue to shape conflict and displacement today.', detail: 'Many of the world\'s most enduring conflicts trace to borders drawn by European colonial powers with little regard for ethnic or political realities. The Sykes-Picot Agreement (1916), the partition of India (1947), and the Berlin Conference\'s carve-up of Africa (1884-5) all produced borders that continue to generate violence and mass displacement.', source: 'James Barr, A Line in the Sand, 2011' }
			]
		},
		{
			id: 'books',
			label: 'Books',
			catClass: 'cat-books',
			cards: [
				{ stat: null, headline: '"The New Jim Crow" by Michelle Alexander (2010) argues that mass incarceration functions as a racial caste system.', detail: 'Alexander documents how the War on Drugs, despite roughly equal drug use across racial groups, resulted in the mass criminalization of Black communities. Felony conviction creates a permanent second-class status, stripping people of voting rights, access to housing, employment, and public benefits.', source: 'Michelle Alexander, The New Jim Crow, 2010' },
				{ stat: null, headline: '"Are Prisons Obsolete?" by Angela Davis (2003) asks whether abolition, not reform, is the necessary response.', detail: 'Davis argues that prisons have never been primarily about rehabilitation or public safety, they have been about social control. She traces the prison\'s history from post-Civil War Black Codes through the prison-industrial complex, and argues that the question of abolition is the historically serious one.', source: 'Angela Y. Davis, Are Prisons Obsolete?, 2003' },
				{ stat: null, headline: '"Just Mercy" by Bryan Stevenson (2014) follows capital cases and the people wrongly condemned to death.', detail: 'Stevenson, founder of the Equal Justice Initiative, writes about Walter McMillian and others on Alabama\'s death row, wrongly convicted, poorly represented, failed by a system where poverty and race determined outcomes more than evidence.', source: 'Bryan Stevenson, Just Mercy, 2014' },
				{ stat: null, headline: '"Discipline and Punish" by Michel Foucault (1975) traces how modern prisons became instruments of societal control.', detail: 'Foucault argues that the shift from public torture to imprisonment was not a humanitarian reform, it was a more efficient method of control. The prison disciplines the body and the mind, and extends its logic into schools, hospitals, and factories. The concept of the "panopticon" has become a foundational metaphor for surveillance societies.', source: 'Michel Foucault, Discipline and Punish, 1975' },
				{ stat: null, headline: '"The Warmth of Other Suns" by Isabel Wilkerson (2010) documents how the Great Migration was shaped by criminalized Black life in the South.', detail: 'Six million Black Americans left the South for northern and western cities between 1915 and 1970. Wilkerson\'s account makes clear it was a flight from a legal system designed to criminalize, exploit, and terrorize Black people through vagrancy laws, convict leasing, and lynching.', source: 'Isabel Wilkerson, The Warmth of Other Suns, 2010' },
				{ stat: null, headline: '"Slavery by Another Name" by Douglas Blackmon (2008) documents how convict leasing re-enslaved Black Americans after the Civil War.', detail: 'After the 13th Amendment abolished slavery "except as punishment for crime," Southern states used vagrancy laws and convict leasing to force Black men into unpaid labor for mines, plantations, and factories. Blackmon documents cases where men were arrested for "crimes" like idleness and leased to corporations. The system operated until World War II.', source: 'Douglas Blackmon, Slavery by Another Name, 2008' },
				{ stat: null, headline: '"In the Place of Justice" by Wilbert Rideau (2010) is a memoir written from inside Angola Prison over 44 years.', detail: 'Rideau was convicted of murder at 19 and spent 44 years at Louisiana State Penitentiary. From inside, he became an award-winning journalist and advocate. His book is one of the most comprehensive accounts of what prison actually is: not rehabilitation, not deterrence, but a place where time and humanity are spent.', source: 'Wilbert Rideau, In the Place of Justice, 2010' }
			]
		},
		{
			id: 'tech',
			label: 'Technological Systems',
			catClass: 'cat-tech',
			cards: [
				{ stat: null, headline: 'Predictive policing algorithms direct police resources based on historical crime data, which reflects historical policing bias.', detail: 'Systems like PredPol use past arrest data to predict where future crime will occur. Because Black and low-income neighborhoods have historically been over-policed, these areas generate more arrest data, which causes algorithms to direct more police there, amplifying existing disparities while appearing objective.', source: 'Rashida Richardson et al., Dirty Data, Bad Predictions, 2019' },
				{ stat: '83%', headline: 'A widely used risk assessment tool incorrectly labeled Black defendants as high-risk at nearly twice the rate of white defendants.', detail: 'ProPublica\'s 2016 investigation of the COMPAS algorithm found it was racially biased despite not using race as an input variable. It falsely flagged Black defendants as high-risk 83% more often than white defendants. The tool\'s scores influenced bail, sentencing, and parole decisions.', source: 'ProPublica, Machine Bias, 2016' },
				{ stat: null, headline: 'Facial recognition technology has a significantly higher error rate for darker-skinned faces.', detail: 'MIT researcher Joy Buolamwini found that commercial facial recognition systems misclassified darker-skinned women at rates up to 34%, compared to under 1% for lighter-skinned men. Multiple wrongful arrests have been documented, all involving Black men misidentified by the technology.', source: 'Joy Buolamwini & Timnit Gebru, Gender Shades, 2018' },
				{ stat: '$1B+', headline: 'The prison phone call industry generates over $1 billion annually, largely from families of incarcerated people.', detail: 'Companies charge families up to $25 for a 15-minute call. Prisons receive commission payments from these contracts, giving them a financial incentive to maintain high rates. The burden falls disproportionately on low-income families of color.', source: 'Prison Policy Initiative, 2021' },
				{ stat: null, headline: 'Electronic monitoring (ankle monitors) has expanded dramatically as an "alternative" to incarceration, but functions as its own form of control.', detail: 'Over 200,000 people in the US are on electronic monitoring at any given time. People pay fees for the devices, often $5-15 per day, to private companies. Movement restrictions and technical malfunctions regularly result in violations and reincarceration.', source: 'Center for Media Justice, 2020' },
				{ stat: null, headline: 'Surveillance technology developed for use in prisons and border enforcement is increasingly deployed in cities.', detail: 'License plate readers, cell-site simulators, social media monitoring, and real-time camera networks, all tested in carceral and border contexts, have migrated into urban policing, often without legislative oversight.', source: 'Electronic Frontier Foundation, Street-Level Surveillance project, 2022' }
			]
		},
		{
			id: 'archives',
			label: 'Archives',
			catClass: 'cat-archives',
			cards: [
				{ stat: null, headline: 'Archives are not neutral. What gets preserved, and what gets destroyed, is a political act.', detail: 'Documents relating to colonial violence, prison conditions, and state surveillance have been routinely destroyed, classified, or never created. The absence of a record is not the same as the absence of an event. Archival scholars call this "the colonial archive problem": the institutions that committed harm also controlled documentation of that harm.', source: 'Ann Laura Stoler, Along the Archival Grain, 2009' },
				{ stat: null, headline: 'The voices of incarcerated people have been systematically excluded from official histories.', detail: 'Most accounts of prisons come from administrators, reformers, and criminologists, not people who were inside. Prisoner-produced texts have been confiscated, destroyed, or simply not collected by institutions. Organizations like the Prison Journalism Project are working to document incarcerated people\'s accounts, but decades of testimony have been lost.', source: 'Prison Journalism Project / Vera Institute' },
				{ stat: null, headline: 'The 1971 Attica Prison uprising, and its brutal suppression, was subject to a 44-year cover-up.', detail: 'When New York State Police retook Attica in September 1971, 43 people died. Governor Rockefeller initially claimed the hostages had been killed by prisoners. Autopsies showed all hostages died from gunfire fired by state police. Evidence was suppressed, destroyed, or sealed. A state commission report was not fully released until 2021.', source: 'Heather Ann Thompson, Blood in the Water, 2016' },
				{ stat: null, headline: 'Photographs taken inside Nazi concentration camps by the SS were originally intended as administrative documents, not evidence.', detail: 'The Auschwitz Album, the only surviving photographic record of arrivals at Auschwitz-Birkenau, was taken by SS photographers in May 1944. It was not created as evidence of crime but as bureaucratic record-keeping. Most SS documentation was destroyed as Allied forces advanced.', source: 'Yad Vashem Archives / United States Holocaust Memorial Museum' },
				{ stat: null, headline: 'The Freedom of Information Act (FOIA) has been a crucial tool for exposing carceral abuses, and has been frequently obstructed.', detail: 'Journalists and researchers have used FOIA to expose wrongful convictions, secret surveillance programs, and death-in-custody cases. Agencies routinely delay, redact, or deny requests related to law enforcement. The DOJ is among the most frequent FOIA litigants, defending its own opacity.', source: 'MuckRock / Reporters Committee for Freedom of the Press, 2022' },
				{ stat: null, headline: 'Oral history projects have captured testimonies from survivors of Japanese American incarceration that official records erased.', detail: 'The Japanese American Citizens League and Densho have conducted thousands of oral history interviews. These testimonies document experiences that administrative records never captured: the specific loss of homes, the shame deliberately instilled, the silence that lasted decades.', source: 'Densho Digital Repository / Japanese American Citizens League' },
				{ stat: null, headline: 'Documents are disappearing. Digital records are particularly fragile, and carceral institutions are not required to preserve them.', detail: 'Email correspondence, surveillance footage, electronic healthcare records, and risk-assessment algorithm outputs, all produced by carceral systems, exist in formats that degrade, are overwritten, or are deleted without oversight. In many cases the digital turn has made it easier to erase the record, not harder.', source: 'Society of American Archivists, 2021' }
			]
		}
	],
	state: { section: 0, card: 0 }
};

// Opens the Learn Cards modal for whichever section button the user clicked
function openLearnCardsModal(sectionName) {
	const existingModal = document.getElementById('learn-cards-modal-custom');
	if (existingModal) existingModal.remove();

	//  lookup to translate section slugs into data array positions
	const sectionMap = { prisons: 0, camps: 1, empires: 2, books: 3, tech: 4, archives: 5 };
	const sectionIdx = sectionMap[sectionName] || 0;

	//  the modal shell (header + content region) 
	const modal = document.createElement('div');
	modal.id = 'learn-cards-modal-custom';
	modal.className = 'learn-cards-modal';
	modal.innerHTML = `
		<div class="learn-cards-modal-overlay"></div>
		<div class="learn-cards-modal-content">
			<div class="learn-cards-modal-header">
				<div>
					<h3>Learn Cards</h3>
					<p>Explore what these systems are, how they work, and who they affect</p>
				</div>
				<button class="learn-cards-close">✕</button>
			</div>
			<div class="learn-cards-card-display" id="learn-cards-display"></div>
		</div>
	`;
	document.body.appendChild(modal);

	// Reset card state and render the first card
	learnCardsData.state = { section: sectionIdx, card: 0 };
	renderLearnCard();

	const closeBtn = modal.querySelector('.learn-cards-close');
	closeBtn.addEventListener('click', () => modal.remove());

	const overlay = modal.querySelector('.learn-cards-modal-overlay');
	overlay.addEventListener('click', () => modal.remove());

	document.addEventListener('keydown', handleLearnCardsKeydown);
}

// Paints whichever card the user is currently on and rewires  controls
function renderLearnCard() {
	const section = learnCardsData.sections[learnCardsData.state.section];
	const card = section.cards[learnCardsData.state.card];
	const display = document.getElementById('learn-cards-display');

	if (!card) return;

	const total = section.cards.length;
	const percent = Math.round((learnCardsData.state.card / total) * 100);

	display.innerHTML = `
		<div class="learn-cards-progress">
			<div style="flex:1">
				<div style="font-size:11px;color:#6d6d6d;margin-bottom:5px;">${section.label}</div>
				<div class="learn-cards-progress-bar">
					<div class="learn-cards-progress-fill" style="width:${percent}%"></div>
				</div>
			</div>
			<div style="font-size:11px;color:#6d6d6d;margin-left:10px;">${learnCardsData.state.card + 1}/${total}</div>
		</div>
		<div class="learn-cards-card">
			<span class="learn-cards-category ${section.catClass}">${section.label}</span>
			<h4 style="margin:16px 0 8px;font-size:16px;color:#151515;">${card.headline}</h4>
			<p style="margin:0 0 12px;color:#555;font-size:13px;line-height:1.6;">${card.detail}</p>
			<p style="margin:0;font-size:10px;color:#6d6d6d;font-style:italic;">${card.source}</p>
			${card.stat ? `<div style="font-size:36px;font-weight:bold;color:#151515;margin-bottom:8px;">${card.stat}</div>` : ''}
		</div>
		<div class="learn-cards-controls">
			<button class="learn-cards-btn" id="prev-btn" style="${learnCardsData.state.card === 0 ? 'opacity:0.5;cursor:not-allowed;' : 'cursor:pointer;'}">&larr; Prev</button>
			<button class="learn-cards-btn" id="next-btn" style="${learnCardsData.state.card === total - 1 ? 'background:#000;color:#fff;cursor:pointer;' : 'cursor:pointer;'}">${learnCardsData.state.card === total - 1 ? 'Finish' : 'Next'} &rarr;</button>
		</div>
	`;

	// Reattach nav handlers after each re-render.
	document.getElementById('prev-btn').onclick = () => {
		if (learnCardsData.state.card > 0) {
			learnCardsData.state.card--;
			renderLearnCard();
		}
	};

	document.getElementById('next-btn').onclick = () => {
		if (learnCardsData.state.card < total - 1) {
			learnCardsData.state.card++;
			renderLearnCard();
		} else {
			document.getElementById('learn-cards-modal-custom').remove();
		}
	};
}

// Keyboard support so this experience works beyond mouse/touch.
function handleLearnCardsKeydown(e) {
	const modal = document.getElementById('learn-cards-modal-custom');
	if (!modal) return;

	if (e.key === 'Escape') {
		modal.remove();
		return;
	}

	const section = learnCardsData.sections[learnCardsData.state.section];

	if (e.key === 'ArrowRight' && learnCardsData.state.card < section.cards.length - 1) {
		learnCardsData.state.card++;
		renderLearnCard();
	}

	if (e.key === 'ArrowLeft' && learnCardsData.state.card > 0) {
		learnCardsData.state.card--;
		renderLearnCard();
	}
}

// "A Day in the Life":
// runs an interactive timeline of prison routine, tracks selected stats,
// and ends with a summary reflection.
function openDayInLifeModal() {
	const existingModal = document.getElementById('day-in-life-modal-custom');
	if (existingModal) existingModal.remove();

	const modal = document.createElement('div');
	modal.id = 'day-in-life-modal-custom';
	modal.className = 'day-in-life-modal';
	
	modal.innerHTML = `
		<div class="day-in-life-modal-content">
			<div class="day-in-life-header">
				<div>
					<h3 class="day-in-life-title">A Day in the Life</h3>
					<p class="day-in-life-subtitle">A Federal Correctional Institution · General Population</p>
				</div>
				<button class="day-in-life-close">✕</button>
			</div>

			<div class="day-in-life-timeline">
				<div class="day-in-life-timeline-track"><div class="day-in-life-timeline-fill" id="day-timeline-fill" style="width:0%"></div></div>
				<div class="day-in-life-timeline-labels"><span>5:00 AM</span><span>8:00 AM</span><span>12:00 PM</span><span>4:00 PM</span><span>8:00 PM</span><span>10:00 PM</span></div>
			</div>

			<div class="day-in-life-scene-area" id="day-scene-area">
				<div class="day-in-life-scene-card active" data-scene="0" data-contact="0" data-outside="0" data-calories="0">
					<div class="day-in-life-scene-time">5:00 <span>AM · Count Time</span></div>
					<div class="day-in-life-scene-tone day-in-life-tone-monotonous">Monotonous</div>
					<p class="day-in-life-scene-desc">A loud buzzer. Fluorescent lights snap on before dawn. You stand at your cell door while officers walk the tier, counting bodies. This happens five times a day, sometimes more if there's a discrepancy. You wait in silence until count clears. It takes 40 minutes today.</p>
					<div class="day-in-life-choice-prompt"><p>↳ While you wait, what do you do?</p><div class="day-in-life-choice-options"><button class="day-in-life-choice-btn">Stare at the ceiling</button><button class="day-in-life-choice-btn">Try to go back to sleep standing up</button><button class="day-in-life-choice-btn">Count ceiling tiles</button></div><div class="day-in-life-choice-response">It doesn't matter. The outcome is the same. Count clears at 5:42 AM.</div></div>
				</div>
				<div class="day-in-life-scene-card" data-scene="1" data-contact="5" data-outside="0" data-calories="600">
					<div class="day-in-life-scene-time">6:00 <span>AM · Breakfast</span></div>
					<div class="day-in-life-scene-tone day-in-life-tone-monotonous">Monotonous</div>
					<p class="day-in-life-scene-desc">You have 20 minutes to eat. The cafeteria is loud with trays and shouted greetings. Today: powdered eggs, a carton of milk, two slices of white bread. You sit with the same group you always sit with, not by choice, exactly, but by the unspoken geography of the room. You exchange maybe five words.</p>
					<div class="day-in-life-choice-prompt"><p>↳ The person across from you tries to start a conversation. You...</p><div class="day-in-life-choice-options"><button class="day-in-life-choice-btn">Keep it short, eyes on your tray</button><button class="day-in-life-choice-btn">Talk, it's a rare moment of normalcy</button></div><div class="day-in-life-choice-response">A guard shouts "Wrap it up." Trays go back. You file out. The conversation, whatever it was, is over.</div></div>
				</div>
				<div class="day-in-life-scene-card" data-scene="2" data-contact="0" data-outside="0" data-calories="0">
					<div class="day-in-life-scene-time">8:00 <span>AM · Work Assignment</span></div>
					<div class="day-in-life-scene-tone day-in-life-tone-monotonous">Monotonous</div>
					<p class="day-in-life-scene-desc">Your work assignment is laundry. You earn $0.23 an hour, the federal minimum for incarcerated workers. You sort, wash, and fold linens for four hours in a hot basement room. There is no window. The machines are loud enough that conversation is impossible. You think about things. Mostly you try not to think about things.</p>
					<div class="day-in-life-choice-prompt"><p>↳ A coworker slips you a note asking for a favor. You...</p><div class="day-in-life-choice-options"><button class="day-in-life-choice-btn">Refuse, not worth the risk</button><button class="day-in-life-choice-btn">Help, you owe him from last week</button><button class="day-in-life-choice-btn">Pretend you didn't see it</button></div><div class="day-in-life-choice-response">Every small decision carries weight here.</div></div>
				</div>
				<div class="day-in-life-scene-card" data-scene="3" data-contact="3" data-outside="0" data-calories="700">
					<div class="day-in-life-scene-time">12:00 <span>PM · Lunch & Mail</span></div>
					<div class="day-in-life-scene-tone day-in-life-tone-fleeting">Fleeting</div>
					<p class="day-in-life-scene-desc">Lunch: a bologna sandwich, an apple, a packet of mustard. Today there is also mail. A letter from your sister, the first in three months. You read it twice in the cafeteria line, then fold it carefully into your pocket. You will read it again tonight. Letters become objects of enormous weight.</p>
					<div class="day-in-life-choice-prompt"><p>↳ Your sister asks how you're really doing. When you write back, you...</p><div class="day-in-life-choice-options"><button class="day-in-life-choice-btn">Tell her the truth</button><button class="day-in-life-choice-btn">Say you're fine, no need to worry her</button></div><div class="day-in-life-choice-response">Most people say they're fine. Maintaining relationships from inside means constantly managing the distance, emotional and physical.</div></div>
				</div>
				<div class="day-in-life-scene-card" data-scene="4" data-contact="0" data-outside="60" data-calories="0">
					<div class="day-in-life-scene-time">2:00 <span>PM · Yard Time</span></div>
					<div class="day-in-life-scene-tone day-in-life-tone-fleeting">Fleeting</div>
					<p class="day-in-life-scene-desc">One hour of outdoor recreation. The yard is a concrete rectangle surrounded by two fences topped with razor wire. There is a basketball court, a pull-up bar, and a few metal benches bolted to the ground. The sky is overcast. You walk the perimeter, 14 laps to a mile. This is the most open space you will be in all day.</p>
					<div class="day-in-life-choice-prompt"><p>↳ You have one hour. What do you do with it?</p><div class="day-in-life-choice-options"><button class="day-in-life-choice-btn">Walk alone</button><button class="day-in-life-choice-btn">Play basketball</button><button class="day-in-life-choice-btn">Sit and watch the sky</button></div><div class="day-in-life-choice-response">The buzzer sounds at 3:00 PM. Back inside. The transition from open air to locked corridor takes about four seconds.</div></div>
				</div>
				<div class="day-in-life-scene-card" data-scene="5" data-contact="0" data-outside="0" data-calories="0">
					<div class="day-in-life-scene-time">4:00 <span>PM · Lockdown Count</span></div>
					<div class="day-in-life-scene-tone day-in-life-tone-tense">Tense</div>
					<p class="day-in-life-scene-desc">Afternoon count. Back in your cell. There was an incident on another block this morning, a fight, so today's count takes longer than usual. You hear shouting down the corridor. Then silence. Count doesn't clear for 90 minutes. You are not told why.</p>
					<div class="day-in-life-choice-prompt"><p>↳ Extended lockdown. What do you reach for?</p><div class="day-in-life-choice-options"><button class="day-in-life-choice-btn">A book from the shelf</button><button class="day-in-life-choice-btn">Lie on the bunk, stare up</button><button class="day-in-life-choice-btn">Push-ups until you can't</button></div><div class="day-in-life-choice-response">You have been in this cell for 6 hours today. You have 5 more to go. Time moves differently inside.</div></div>
				</div>
				<div class="day-in-life-scene-card" data-scene="6" data-contact="8" data-outside="0" data-calories="750">
					<div class="day-in-life-scene-time">6:00 <span>PM · Dinner & Phone</span></div>
					<div class="day-in-life-scene-tone day-in-life-tone-hollow">Hollow</div>
					<p class="day-in-life-scene-desc">Dinner is 25 minutes. Afterward, there is a 15-minute window to use the phone. Calls cost $0.21 per minute, billed to your family. You call home. The line rings six times. No answer. You stand at the phone with 12 minutes remaining, watching others talk to their people. You try again. Voicemail.</p>
					<div class="day-in-life-choice-prompt"><p>↳ You leave a message. What do you say?</p><div class="day-in-life-choice-options"><button class="day-in-life-choice-btn">"It's me. Just calling. I love you."</button><button class="day-in-life-choice-btn">"Call me back when you can."</button><button class="day-in-life-choice-btn">You hang up without leaving one</button></div><div class="day-in-life-choice-response">The phone window closes. Incarcerated people make an average of 1.4 calls per week due to cost barriers.</div></div>
				</div>
				<div class="day-in-life-scene-card" data-scene="7" data-contact="0" data-outside="0" data-calories="0">
					<div class="day-in-life-scene-time">8:00 <span>PM · Free Time</span></div>
					<div class="day-in-life-scene-tone day-in-life-tone-numb">Numb</div>
					<p class="day-in-life-scene-desc">Two hours before lights out. You can watch TV in the common room, there is one television shared by 40 people, and the volume is always contested. You can write letters. You can read. You can lie on your bunk and think about the life you had, or the one you are trying to build for afterward.</p>
					<div class="day-in-life-choice-prompt"><p>↳ You start writing a letter, but stop halfway through. Why?</p><div class="day-in-life-choice-options"><button class="day-in-life-choice-btn">You don't know what to say anymore</button><button class="day-in-life-choice-btn">Lights flicker, a warning</button><button class="day-in-life-choice-btn">You hear something outside the door</button></div><div class="day-in-life-choice-response">You fold the unfinished letter. Maybe tomorrow. But there is always something that makes finishing feel impossible.</div></div>
				</div>
				<div class="day-in-life-scene-card" data-scene="8" data-contact="0" data-outside="0" data-calories="0">
					<div class="day-in-life-scene-time">10:00 <span>PM · Lights Out</span></div>
					<div class="day-in-life-scene-tone day-in-life-tone-isolating">Isolating</div>
					<p class="day-in-life-scene-desc">Lights out. The fluorescents cut to a dim security lamp that stays on all night. It's never fully dark here. You lie in the narrow bunk, 30 inches wide, and listen to the sounds of the block: coughing, a distant argument, the buzz of the security door opening and closing. Tomorrow will be the same. And the day after.</p>
				</div>
			</div>

			<div class="day-in-life-stats-bar" id="day-stats-bar">
				<div class="day-in-life-stat-item"><div class="day-in-life-stat-label">Human contact</div><div class="day-in-life-stat-value" id="day-stat-contact">0 min</div></div>
				<div class="day-in-life-stat-item"><div class="day-in-life-stat-label">Time outdoors</div><div class="day-in-life-stat-value" id="day-stat-outside">0 min</div></div>
				<div class="day-in-life-stat-item"><div class="day-in-life-stat-label">Calories today</div><div class="day-in-life-stat-value" id="day-stat-calories">0</div></div>
				<div class="day-in-life-stat-item"><div class="day-in-life-stat-label">Hours in cell</div><div class="day-in-life-stat-value" id="day-stat-cell">0 hrs</div></div>
			</div>

			<div class="day-in-life-summary-screen" id="day-summary-screen">
				<div class="day-in-life-summary-title">Your Day, By the Numbers</div>
				<div class="day-in-life-summary-sub">Federal Correctional Institution · General Population · One Day</div>
				<div class="day-in-life-summary-stats">
					<div class="day-in-life-summary-stat"><div class="day-in-life-summary-stat-num">23</div><div class="day-in-life-summary-stat-label">Minutes of meaningful human contact</div></div>
					<div class="day-in-life-summary-stat"><div class="day-in-life-summary-stat-num">60</div><div class="day-in-life-summary-stat-label">Minutes spent outdoors</div></div>
					<div class="day-in-life-summary-stat"><div class="day-in-life-summary-stat-num">2,050</div><div class="day-in-life-summary-stat-label">Calories (USDA min. is 2,200)</div></div>
					<div class="day-in-life-summary-stat"><div class="day-in-life-summary-stat-num">11</div><div class="day-in-life-summary-stat-label">Hours locked in a 6×8 ft cell</div></div>
					<div class="day-in-life-summary-stat"><div class="day-in-life-summary-stat-num">5×</div><div class="day-in-life-summary-stat-label">Counted by guards today</div></div>
					<div class="day-in-life-summary-stat"><div class="day-in-life-summary-stat-num">$0.23</div><div class="day-in-life-summary-stat-label">Earned per hour of labor</div></div>
				</div>
				<div class="day-in-life-summary-reflection">
					<p>"The most difficult thing is not the violence or the deprivation, it is the relentlessness of sameness. The same walls, the same sounds, the same schedule. After months, you stop expecting anything different. That is when something in you begins to change, quietly, and permanently."</p>
					<div class="day-in-life-summary-source">— Composite account based on testimonies collected by the Prison Policy Initiative</div>
				</div>
				<div class="day-in-life-summary-reflection">
					<p>This simulation reflects conditions at a medium-security federal facility. Conditions vary significantly, and often worsen, in state prisons, county jails, and solitary confinement, where some people spend 22–24 hours per day in a cell with no human contact for months or years.</p>
				</div>
			</div>

			<div class="day-in-life-footer">
				<div class="day-in-life-step-counter" id="day-step-counter">Scene 1 of 9</div>
				<div class="day-in-life-nav-btns">
					<button class="day-in-life-nav-btn" id="day-prev-btn" disabled>← Prev</button>
					<button class="day-in-life-nav-btn primary" id="day-next-btn">Next →</button>
					<button class="day-in-life-nav-btn" id="day-restart-btn" style="display:none;">↺ Start Over</button>
					<button class="day-in-life-nav-btn finish" id="day-finish-btn" style="display:none;">Finish</button>
				</div>
			</div>
		</div>
	`;
	
	document.body.appendChild(modal);

	// Runtime state for scene progression and totals
	let dayInLifeCurrent = 0;
	let contactTotal = 0;
	let outsideTotal = 0;
	let caloriesTotal = 0;
	const tl = [0, 6, 16, 33, 47, 58, 72, 83, 94, 100];

	const scenes = modal.querySelectorAll('.day-in-life-scene-card');
	const totalScenes = scenes.length;

	function dayNavigate(dir) {
		const prev = dayInLifeCurrent;
		dayInLifeCurrent = Math.max(0, Math.min(totalScenes - 1, dayInLifeCurrent + dir));
		if (dir === 1 && prev !== dayInLifeCurrent) {
			const s = scenes[prev];
			contactTotal += parseInt(s.dataset.contact || 0);
			outsideTotal += parseInt(s.dataset.outside || 0);
			caloriesTotal += parseInt(s.dataset.calories || 0);
			dayUpdateStats();
		}
		scenes.forEach(s => s.classList.remove('active'));
		const sceneArea = modal.querySelector('#day-scene-area');
		const summary = modal.querySelector('#day-summary-screen');
		const statsBar = modal.querySelector('#day-stats-bar');
		const footer = modal.querySelector('.day-in-life-footer');
		
		if (dayInLifeCurrent === totalScenes - 1 && dir === 1 && prev === totalScenes - 1) {
			sceneArea.style.display = 'none';
			statsBar.style.display = 'none';
			summary.classList.add('active');
			const prevBtn = modal.querySelector('#day-prev-btn');
			const nextBtn = modal.querySelector('#day-next-btn');
			const restartBtn = modal.querySelector('#day-restart-btn');
			const finishBtn = modal.querySelector('#day-finish-btn');
			prevBtn.style.display = 'none';
			nextBtn.style.display = 'none';
			restartBtn.style.display = 'inline-block';
			finishBtn.style.display = 'inline-block';
		} else {
			scenes[dayInLifeCurrent].classList.add('active');
		}
		modal.querySelector('#day-timeline-fill').style.width = tl[dayInLifeCurrent] + '%';
		modal.querySelector('#day-step-counter').textContent = `Scene ${dayInLifeCurrent + 1} of ${totalScenes}`;
		modal.querySelector('#day-prev-btn').disabled = dayInLifeCurrent === 0;
		const nb = modal.querySelector('#day-next-btn');
		nb.textContent = dayInLifeCurrent === totalScenes - 1 ? 'See Summary →' : 'Next →';
		nb.className = dayInLifeCurrent === totalScenes - 1 ? 'day-in-life-nav-btn finish' : 'day-in-life-nav-btn primary';
	}

	function dayUpdateStats() {
		function flash(id, val) {
			const el = modal.querySelector('#' + id);
			el.textContent = val;
			el.classList.add('updated');
			setTimeout(() => el.classList.remove('updated'), 700);
		}
		flash('day-stat-contact', contactTotal + ' min');
		flash('day-stat-outside', outsideTotal + ' min');
		flash('day-stat-calories', caloriesTotal.toLocaleString());
		flash('day-stat-cell', Math.min(11, Math.round(dayInLifeCurrent * 1.25)) + ' hrs');
	}

	// Choice buttons are mostly reflective, but they do trigger the reveal of the pre-written response text, which adds some interactivity and feedback
	const choiceButtons = modal.querySelectorAll('.day-in-life-choice-btn');
	choiceButtons.forEach(btn => {
		btn.addEventListener('click', function() {
			const choicePrompt = this.closest('.day-in-life-choice-prompt');
			choicePrompt.querySelectorAll('.day-in-life-choice-btn').forEach(b => b.classList.remove('selected'));
			this.classList.add('selected');
			choicePrompt.querySelector('.day-in-life-choice-response').classList.add('visible');
		});
	});

	// nav controls for stepping through the timeline scenes
	const closeBtn = modal.querySelector('.day-in-life-close');
	closeBtn.addEventListener('click', () => modal.remove());

	const prevBtn = modal.querySelector('#day-prev-btn');
	const nextBtn = modal.querySelector('#day-next-btn');
	prevBtn.addEventListener('click', () => dayNavigate(-1));
	nextBtn.addEventListener('click', () => dayNavigate(1));

	// reset to replay the timeline from scene 1
	const restartBtn = modal.querySelector('#day-restart-btn');
	restartBtn.addEventListener('click', () => {
		dayInLifeCurrent = 0;
		contactTotal = 0;
		outsideTotal = 0;
		caloriesTotal = 0;
		scenes.forEach(s => {
			s.classList.remove('active');
			s.querySelectorAll('.day-in-life-choice-btn').forEach(btn => btn.classList.remove('selected'));
			s.querySelectorAll('.day-in-life-choice-response').forEach(resp => resp.classList.remove('visible'));
		});
		scenes[0].classList.add('active');
		const sceneArea = modal.querySelector('#day-scene-area');
		const summary = modal.querySelector('#day-summary-screen');
		const statsBar = modal.querySelector('#day-stats-bar');
		const footer = modal.querySelector('.day-in-life-footer');
		sceneArea.style.display = 'block';
		statsBar.style.display = 'flex';
		footer.style.display = 'flex';
		summary.classList.remove('active');
		modal.querySelector('#day-timeline-fill').style.width = '0%';
		modal.querySelector('#day-step-counter').textContent = 'Scene 1 of 9';
		modal.querySelector('#day-prev-btn').disabled = true;
		nextBtn.textContent = 'Next →';
		nextBtn.className = 'day-in-life-nav-btn primary';
		prevBtn.style.display = 'inline-block';
		nextBtn.style.display = 'inline-block';
		restartBtn.style.display = 'none';
		modal.querySelector('#day-finish-btn').style.display = 'none';
		modal.querySelector('#day-stat-contact').textContent = '0 min';
		modal.querySelector('#day-stat-outside').textContent = '0 min';
		modal.querySelector('#day-stat-calories').textContent = '0';
		modal.querySelector('#day-stat-cell').textContent = '0 hrs';
	});

	//  finish exits the experience .
	const finishBtn = modal.querySelector('#day-finish-btn');
	finishBtn.addEventListener('click', () => modal.remove());

	// Clicking outside the panel closes the modal
	modal.addEventListener('click', (e) => {
		if (e.target === modal) modal.remove();
	});
}

// "The Censor's Desk":
// player role-plays as a gatekeeper and sees how publication choices
// shape what culture remembers versus what gets buried
function openBooksGame() {
	const existingModal = document.getElementById('books-game-modal-custom');
	if (existingModal) existingModal.remove();

	const modal = document.createElement('div');
	modal.id = 'books-game-modal-custom';
	modal.className = 'day-in-life-modal'; // reuse modal class

	modal.innerHTML = `
		<div class="books-game-modal-content">

			<!-- HEADER -->
			<div class="books-game-header">
				<div>
					<h3 class="books-game-title">The Censor's Desk</h3>
					<p class="books-game-subtitle">You control what gets published. Choose carefully, history is watching.</p>
				</div>
				<button class="books-game-close">✕</button>
			</div>

			<!-- ROLE SELECTION SCREEN -->
			<div class="books-game-screen active" id="books-role-screen">
				<p class="books-game-role-intro">
					Every book that reached a reader first passed through a gatekeeper. 
					Choose your role. Your choices will determine what survives.
				</p>
				<div class="books-game-role-grid">
					<button class="books-game-role-card" data-role="publisher" data-role-label="The Publisher" data-role-desc="New York, 1968. You run a mid-size publishing house. What you print becomes canon. What you pass on disappears.">
						<div class="books-game-role-name">The Publisher</div>
						<div class="books-game-role-flavor">New York, 1968</div>
					</button>
					<button class="books-game-role-card" data-role="librarian" data-role-label="The Librarian" data-role-desc="Alabama, 2023. A school board has handed you a list. Your shelf, your decision.">
						<div class="books-game-role-name">The Librarian</div>
						<div class="books-game-role-flavor">Alabama, 2023</div>
					</button>
					<button class="books-game-role-card" data-role="official" data-role-label="The Censor" data-role-desc="Soviet Union, 1937. The state has given you a red pen. Every manuscript crosses your desk first.">
						<div class="books-game-role-name">The Censor</div>
						<div class="books-game-role-flavor">Soviet Union, 1937</div>
					</button>
				</div>
			</div>

			<!-- GAME SCREEN -->
			<div class="books-game-screen" id="books-play-screen">

				<div class="books-game-progress-bar">
					<div class="books-game-progress-fill" id="books-progress-fill" style="width:0%"></div>
				</div>

				<div class="books-game-desk">
					<!-- Left: manuscript dossier -->
					<div class="books-game-dossier" id="books-dossier">
						<div class="books-game-stamp-area" id="books-stamp-area"></div>
						<div class="books-game-dossier-label">MANUSCRIPT FILE</div>
						<div class="books-game-dossier-title" id="books-doc-title">,</div>
						<div class="books-game-dossier-meta" id="books-doc-meta">,</div>
						<div class="books-game-dossier-excerpt" id="books-doc-excerpt">,</div>
						<div class="books-game-dossier-flag" id="books-doc-flag"></div>
					</div>

					<!-- Right: decision + pressure -->
					<div class="books-game-decision-panel">
						<div class="books-game-pressure-box" id="books-pressure-box">
							<div class="books-game-pressure-label">Pressure on your desk</div>
							<div class="books-game-pressure-text" id="books-pressure-text">,</div>
						</div>
						<div class="books-game-decision-prompt" id="books-decision-prompt">What do you do?</div>
						<div class="books-game-decision-btns" id="books-decision-btns"></div>
						<div class="books-game-consequence" id="books-consequence"></div>
					</div>
				</div>

				<div class="books-game-step-counter" id="books-step-counter">Case 1 of 6</div>
				<div class="books-game-nav">
					<button class="books-game-nav-btn" id="books-prev-btn" disabled>← Prev</button>
					<button class="books-game-nav-btn primary" id="books-next-btn" style="display:none;">Next Case →</button>
					<button class="books-game-nav-btn finish" id="books-finish-btn" style="display:none;">See the Archive →</button>
				</div>
			</div>

			<!-- SUMMARY SCREEN -->
			<div class="books-game-screen" id="books-summary-screen">
				<div class="books-game-summary-title">The Archive You Built</div>
				<div class="books-game-summary-sub" id="books-summary-role-label">,</div>
				<div class="books-game-summary-ledger" id="books-summary-ledger"></div>
				<div class="books-game-summary-reflection" id="books-summary-reflection"></div>
				<div class="books-game-summary-quote">
				</div>
				<button class="books-game-nav-btn" id="books-restart-btn">↺ Start Over</button>
			</div>

		</div>
	`;

	// scenario decks for each role and their consequences.

	const cases = {
		publisher: [
			{
				title: "Invisible Man",
				meta: "Ralph Ellison · 1952 · Novel",
				excerpt: "A Black man's account of his invisible existence within white American society. No major publisher has touched it. Your readers are mostly white. Marketing says it won't sell.",
				flag: "Commercially risky · Politically charged",
				pressure: "Your biggest advertiser has hinted they'd pull contracts if you publish 'divisive' literature.",
				prompt: "Do you publish it?",
				choices: [
					{ label: "Publish it", outcome: "approved" },
					{ label: "Pass, too risky", outcome: "rejected" },
					{ label: "Publish, but request edits to 'soften' it", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "PUBLISHED", color: "#2a6", text: "Invisible Man wins the National Book Award in 1953. It becomes one of the most important novels in American literature. Your house is credited with courage." },
					rejected: { stamp: "REJECTED", color: "#c33", text: "Another publisher takes it. You pass on a landmark work. Your list stays safe, and forgettable." },
					altered: { stamp: "ALTERED", color: "#b8860b", text: "Ellison refuses your edits. The manuscript goes elsewhere. The 'softened' version you wanted never exists, but the original does." }
				}
			},
			{
				title: "The Feminine Mystique",
				meta: "Betty Friedan · 1963 · Non-fiction",
				excerpt: "Argues that American housewives are suffering a collective, unnamed crisis of identity suppressed by postwar domestic ideology. Friedan calls it 'the problem that has no name.'",
				flag: "Challenges mainstream gender norms",
				pressure: "Several editors have warned this could alienate your core female readership, women who have chosen domesticity.",
				prompt: "Do you publish it?",
				choices: [
					{ label: "Publish it as written", outcome: "approved" },
					{ label: "Pass, too niche", outcome: "rejected" },
					{ label: "Publish it, but reframe the title as self-help", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "PUBLISHED", color: "#2a6", text: "The book sells 3 million copies in the first three years and is widely credited with sparking second-wave feminism. Your editors were wrong." },
					rejected: { stamp: "REJECTED", color: "#c33", text: "Another house publishes it to enormous success. You missed one of the decade's defining books." },
					altered: { stamp: "REFRAMED", color: "#b8860b", text: "The reframing dilutes the argument. The book sells modestly. Its political power is blunted before it reaches readers." }
				}
			},
			{
				title: "Soledad Brother",
				meta: "George Jackson · 1970 · Letters",
				excerpt: "Prison letters written by a Black inmate in California's Soledad Prison. Incendiary, literary, and politically radical. Jackson was killed in prison the year after publication.",
				flag: "Written by an incarcerated person · FBI has flagged the author",
				pressure: "Your legal team is nervous. The FBI has contacted your office. Two distributors have already said they won't carry it.",
				prompt: "What do you do?",
				choices: [
					{ label: "Publish it, the letters are literature", outcome: "approved" },
					{ label: "Decline, the legal risk is too high", outcome: "rejected" },
					{ label: "Publish anonymously, no author credit", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "PUBLISHED", color: "#2a6", text: "The book becomes a touchstone of the prison abolition and Black liberation movements. It is still in print. Jackson's voice survives." },
					rejected: { stamp: "REJECTED", color: "#c33", text: "The letters circulate in samizdat form for years. The archive of incarcerated writing loses a central text from its public record." },
					altered: { stamp: "ANONYMIZED", color: "#b8860b", text: "Without the author's name, the book loses its power as testimony. The man behind the letters is erased from his own words." }
				}
			},
			{
				title: "Bury My Heart at Wounded Knee",
				meta: "Dee Brown · 1970 · History",
				excerpt: "A history of the systematic destruction of American Indian nations told entirely from the Indigenous perspective, using council records, memoirs, and firsthand accounts.",
				flag: "Challenges official American history",
				pressure: "A prominent historian has written to warn you the sourcing is 'unorthodox.' Several reviewers have pre-dismissed it as 'advocacy, not scholarship.'",
				prompt: "Do you publish it?",
				choices: [
					{ label: "Publish it, the sourcing is legitimate", outcome: "approved" },
					{ label: "Request a foreword from a non-Native historian to 'balance' it", outcome: "altered" },
					{ label: "Pass, too politically contested", outcome: "rejected" }
				],
				consequences: {
					approved: { stamp: "PUBLISHED", color: "#2a6", text: "The book sells over 5 million copies worldwide and permanently changes how American westward expansion is taught. The 'unorthodox' sourcing is now considered its greatest strength." },
					rejected: { stamp: "REJECTED", color: "#c33", text: "Another publisher takes it. You were on the wrong side of a historical reckoning." },
					altered: { stamp: "FRAMED", color: "#b8860b", text: "Adding a non-Native foreword repositions the book as an outside perspective on Indigenous experience, undermining its entire argument before the first chapter." }
				}
			},
			{
				title: "Giovanni's Room",
				meta: "James Baldwin · 1956 · Novel",
				excerpt: "A white American man in Paris falls in love with an Italian man. Written by a Black author, Baldwin's own publisher rejected it. They said it would 'destroy his reputation.'",
				flag: "Explicit same-sex relationship · Author advised to use a pseudonym",
				pressure: "Baldwin's previous publisher says publishing this will make him 'unmarketable.' Your sales team agrees. The author refuses a pseudonym.",
				prompt: "What do you do?",
				choices: [
					{ label: "Publish it under his name, as he insists", outcome: "approved" },
					{ label: "Decline, the market isn't ready", outcome: "rejected" },
					{ label: "Offer to publish it under a pseudonym", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "PUBLISHED", color: "#2a6", text: "Giovanni's Room is now considered one of the greatest American novels of the 20th century. Baldwin's name on it matters. His refusal to hide was the point." },
					rejected: { stamp: "REJECTED", color: "#c33", text: "The novel is eventually published in the UK. American readers wait years. You helped delay a landmark of queer literature." },
					altered: { stamp: "SUPPRESSED", color: "#b8860b", text: "Baldwin refuses a pseudonym and walks away. The manuscript sits unpublished for two more years. When it does come out, the delay has cost him a generation of readers." }
				}
			},
			{
				title: "I Know Why the Caged Bird Sings",
				meta: "Maya Angelou · 1969 · Memoir",
				excerpt: "A memoir of childhood, trauma, race, and survival in the American South. Angelou writes explicitly about sexual violence, racism, and poverty. It is unlike anything else on your list.",
				flag: "Explicit depictions of sexual abuse · Language flagged by advance readers",
				pressure: "A reviewer calls it 'too raw for general audiences.' Your sales director says the sexual content will get it banned in schools, limiting your market.",
				prompt: "Do you publish it as written?",
				choices: [
					{ label: "Publish it, unaltered", outcome: "approved" },
					{ label: "Request edits to the most explicit passages", outcome: "altered" },
					{ label: "Pass, the content is too risky", outcome: "rejected" }
				],
				consequences: {
					approved: { stamp: "PUBLISHED", color: "#2a6", text: "It does get challenged in schools, repeatedly, across decades. It also becomes one of the most taught memoirs in American education, and one of the most frequently banned. Both things are true." },
					rejected: { stamp: "REJECTED", color: "#c33", text: "You refused to publish a survivor's account of her own life because it made you uncomfortable. That discomfort was the point." },
					altered: { stamp: "EDITED", color: "#b8860b", text: "Angelou declines the edits. Her story, she says, is not negotiable. The manuscript goes elsewhere, unaltered." }
				}
			}
		],

		librarian: [
			{
				title: "And Tango Makes Three",
				meta: "Richardson & Parnell · 2005 · Children's picture book",
				excerpt: "Based on the true story of two male penguins in the Central Park Zoo who raised a chick together. It has been the most challenged book in American libraries for years running.",
				flag: "Same-sex family · Listed on school board removal order",
				pressure: "A parent group has submitted a formal complaint. The school board resolution says remove it or face budget review.",
				prompt: "What do you do with it?",
				choices: [
					{ label: "Keep it on the shelf, it belongs here", outcome: "approved" },
					{ label: "Remove it to comply with the board", outcome: "rejected" },
					{ label: "Move it to a restricted section, request for access only", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "RETAINED", color: "#2a6", text: "Three parents complain. Seven request it for their children specifically because of the controversy. The book circulates more than it ever did." },
					rejected: { stamp: "REMOVED", color: "#c33", text: "The book is gone. A child who would have found themselves in those pages never does. You will not know who they were." },
					altered: { stamp: "RESTRICTED", color: "#b8860b", text: "Restriction signals shame. Children learn that some families require special permission to exist in the library. The message is in the process, not just the book." }
				}
			},
			{
				title: "The Hate U Give",
				meta: "Angie Thomas · 2017 · Young Adult Novel",
				excerpt: "A sixteen-year-old Black girl witnesses the police shooting of her unarmed childhood friend. Written for a YA audience, it became one of the most challenged books in American schools.",
				flag: "Anti-police sentiment (per complaint) · Explicit language",
				pressure: "A police officers' association has sent a letter calling the book 'harmful propaganda.' Several parents support removal. One teacher says it's the most important book she's taught in 20 years.",
				prompt: "How do you respond?",
				choices: [
					{ label: "Keep it, student access is non-negotiable", outcome: "approved" },
					{ label: "Remove it pending board review", outcome: "rejected" },
					{ label: "Add a 'discussion guide' warning label to the cover", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "RETAINED", color: "#2a6", text: "The book remains. Students check it out. A student tells you it was the first time she saw her life in a book. You remember this for a long time." },
					rejected: { stamp: "REMOVED", color: "#c33", text: "Removed pending review. Review takes 14 months. The students who needed it most are now a grade older. Some have left the school." },
					altered: { stamp: "LABELED", color: "#b8860b", text: "A warning label is a signal of danger. Students notice. Some are more curious. Others are told by parents not to touch it. The label does its work." }
				}
			},
			{
				title: "Maus",
				meta: "Art Spiegelman · 1991 · Graphic novel",
				excerpt: "A Pulitzer Prize-winning graphic memoir about the Holocaust, told with mice and cats as metaphors. A Tennessee school board voted unanimously to remove it from the eighth-grade curriculum in 2022.",
				flag: "Contains nudity (concentration camp imagery) · Profanity",
				pressure: "Your district cites the same objections as the Tennessee board: eight instances of profanity and one image of a nude figure. The Holocaust is not the stated issue.",
				prompt: "Do you remove it from the curriculum?",
				choices: [
					{ label: "No, the work is Pulitzer-winning testimony. It stays.", outcome: "approved" },
					{ label: "Remove it from the required list; keep it available", outcome: "altered" },
					{ label: "Remove it entirely from school library holdings", outcome: "rejected" }
				],
				consequences: {
					approved: { stamp: "RETAINED", color: "#2a6", text: "Holocaust survivors and historians respond publicly to support the decision. The Tennessee removal made national news. Yours made none, which may be exactly what you wanted." },
					rejected: { stamp: "REMOVED", color: "#c33", text: "A book about genocide is removed for nudity. A Holocaust survivor's story becomes inaccessible to the children who most need to encounter it. The stated reason is not the real one." },
					altered: { stamp: "OPTIONAL", color: "#b8860b", text: "Making a required text optional reduces the chance that students with resistant parents encounter it at all. Access exists on paper. The library copy gathers dust." }
				}
			},
			{
				title: "New Jim Crow",
				meta: "Michelle Alexander · 2010 · Non-fiction",
				excerpt: "An argument that mass incarceration functions as a racial caste system. Originally circulated through churches, prisons, and legal aid offices before mainstream adoption. Now appearing on banned book lists in prison libraries.",
				flag: "Banned from Florida state prison libraries · Flagged for 'inflammatory' content",
				pressure: "Your state's Department of Corrections has sent a memo suggesting libraries should 'consider' removing titles that appear on their restricted list. The memo is not an order. Yet.",
				prompt: "Do you follow the suggestion?",
				choices: [
					{ label: "No, suggestions are not orders. It stays.", outcome: "approved" },
					{ label: "Remove it preemptively to avoid conflict", outcome: "rejected" },
					{ label: "Move it to the reference-only section so it can't be checked out", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "RETAINED", color: "#2a6", text: "The memo was a test of compliance. You declined. The book about mass incarceration remains accessible in a public library, which is precisely what the memo was designed to prevent." },
					rejected: { stamp: "REMOVED", color: "#c33", text: "You removed it before anyone asked you to. Preemptive censorship requires no official order. The memo accomplished its purpose without being an order at all." },
					altered: { stamp: "RESTRICTED", color: "#b8860b", text: "Reference-only means it cannot leave. The people most likely to need this book are the people least likely to have time to sit in a library and read it there." }
				}
			},
			{
				title: "Gender Queer",
				meta: "Maia Kobabe · 2019 · Graphic memoir",
				excerpt: "A memoir about gender identity and sexuality, written in graphic novel form. It has been the single most challenged book in American public libraries for multiple consecutive years.",
				flag: "Explicit sexual content · Gender ideology (per complaint form)",
				pressure: "Fourteen formal complaints have been filed in the past month. A state representative has called your library by name in a press release. Your director wants a decision by Friday.",
				prompt: "The author's story stays or goes?",
				choices: [
					{ label: "It stays. Fourteen complaints do not make a policy.", outcome: "approved" },
					{ label: "Remove it while under review, restore if cleared", outcome: "rejected" },
					{ label: "Move to adult section, out of young adult shelving", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "RETAINED", color: "#2a6", text: "The press release did not become a law. Fourteen complaints represent fourteen people. Your library serves thousands. The book stays for all of them." },
					rejected: { stamp: "REMOVED", color: "#c33", text: "'Under review' is indefinite. Removal pending review has a completion rate of less than 30% in documented cases. You know this. The book is gone." },
					altered: { stamp: "RELOCATED", color: "#b8860b", text: "Adult shelving keeps it technically available. But a teenage reader looking for themselves in a young adult section will not find it there. You moved the book; you also moved its audience." }
				}
			},
			{
				title: "Stamped: Racism, Antiracism, and You",
				meta: "Jason Reynolds & Ibram X. Kendi · 2020 · Young Adult",
				excerpt: "A young adult adaptation of Kendi's Stamped from the Beginning, a history of racist ideas in America, adapted for middle school readers. Among the most banned books in the country.",
				flag: "Critical Race Theory (per complaint) · Makes white students 'feel guilty'",
				pressure: "A parent coalition has delivered a 200-signature petition. A board member has emailed you directly. Your state has passed legislation restricting 'divisive concepts' in schools, vague enough that compliance is unclear.",
				prompt: "Does the history of racism stay in your history section?",
				choices: [
					{ label: "Yes. History is history. It stays.", outcome: "approved" },
					{ label: "Remove it until legal counsel reviews the state law", outcome: "rejected" },
					{ label: "Keep it but pair it with a 'balanced perspectives' display", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "RETAINED", color: "#2a6", text: "Legal counsel reviews the law. It does not require removal. You knew this. The petition was not a law. The email was not an order. The book remains." },
					rejected: { stamp: "REMOVED", color: "#c33", text: "Legal counsel eventually confirms no removal was required. The book spent four months off the shelf during the academic year. Four months is a school year's worth of access." },
					altered: { stamp: "FRAMED", color: "#b8860b", text: "A 'balanced perspectives' display implies the history of racism is a matter of debate. It is not. The display did more damage than the petition." }
				}
			}
		],

		official: [
			{
				title: "The Master and Margarita",
				meta: "Mikhail Bulgakov · 1937 · Novel",
				excerpt: "A satirical novel in which the Devil visits Soviet Moscow. Bulgakov has already been banned from publishing. He sends this manuscript directly to Stalin. It is also on your desk.",
				flag: "Religious content · Satirizes Soviet bureaucracy · Author is a known dissident",
				pressure: "Bulgakov is ill. He is not a threat. But the manuscript mocks everything: the Writers' Union, the literary elite, the machinery of censorship itself. Including desks like yours.",
				prompt: "What do you do with the manuscript?",
				choices: [
					{ label: "Approve, it is too brilliant to suppress", outcome: "approved" },
					{ label: "Reject, it mocks the state", outcome: "rejected" },
					{ label: "Confiscate it; Bulgakov hears nothing", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "APPROVED", color: "#2a6", text: "It would not have mattered. Bulgakov died in 1940 before seeing it published. His wife kept the manuscript hidden for 26 years. It was published in 1966, in a censored version. The full text came out in 1973. It survived despite every desk like yours." },
					rejected: { stamp: "REJECTED", color: "#c33", text: "Bulgakov expected rejection. He had burned an earlier draft himself. His wife typed this one from memory and kept it hidden. The book existed without your permission." },
					altered: { stamp: "CONFISCATED", color: "#b8860b", text: "His wife had already made copies. The manuscript she handed you was not the only one. Counter-archives do not require official approval to survive." }
				}
			},
			{
				title: "Requiem",
				meta: "Anna Akhmatova · 1935,1940 · Poetry",
				excerpt: "A cycle of poems about the Stalinist terror, arrests, disappearances, the endless lines outside prisons where women waited for news of their sons. Akhmatova never wrote it down. Her friends memorized it.",
				flag: "Documents political arrests · Hostile to the state",
				pressure: "An informant has reported that Akhmatova is 'dictating' poetry in private. There is no manuscript. There is nothing to confiscate. But the poems are circulating, orally.",
				prompt: "How do you proceed?",
				choices: [
					{ label: "No manuscript, no case. File it and move on.", outcome: "approved" },
					{ label: "Arrest her, oral circulation is still distribution", outcome: "rejected" },
					{ label: "Surveil her. Wait for a written copy to appear.", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "FILED", color: "#2a6", text: "The poems continue to circulate. A cycle of poems held entirely in human memory is not subject to desk review. Requiem was not published until 1963, in Munich. It could not be seized because it was never written down." },
					rejected: { stamp: "ARRESTED", color: "#c33", text: "Akhmatova's son is arrested instead, used as leverage. She writes a poem praising Stalin in exchange for his release. The regime gets its document. But Requiem has already been memorized by too many people to disappear." },
					altered: { stamp: "SURVEILLED", color: "#b8860b", text: "Surveillance produces a file. The file proves she is a poet. Nothing proves she is a criminal. Requiem exists without paper. Your surveillance cannot touch what was never written." }
				}
			},
			{
				title: "One Day in the Life of Ivan Denisovich",
				meta: "Alexander Solzhenitsyn · 1962 · Novella",
				excerpt: "A single day in a Soviet labor camp, told through the eyes of a prisoner. It has reached Khrushchev's desk directly. He is considering it for publication as evidence that the past has been reformed.",
				flag: "Documents Gulag conditions · Political dynamite, in either direction",
				pressure: "Publishing it could signal de-Stalinization. Not publishing it keeps the camps invisible. Either choice has consequences. Khrushchev is waiting for your recommendation.",
				prompt: "What do you recommend?",
				choices: [
					{ label: "Recommend publication, transparency signals reform", outcome: "approved" },
					{ label: "Recommend suppression, the camps are not open for debate", outcome: "rejected" },
					{ label: "Recommend limited publication, small literary journal, not mass distribution", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "APPROVED", color: "#2a6", text: "Khrushchev authorized publication in 1962. It sold out immediately. Foreign editions followed. Solzhenitsyn's career as a writer of camp literature was established. The camps became discussable, which eventually made them undeniable." },
					rejected: { stamp: "SUPPRESSED", color: "#c33", text: "Suppression kept the Gulag invisible to official discourse. But manuscripts were already circulating in samizdat. Suppression delayed, it did not prevent." },
					altered: { stamp: "LIMITED", color: "#b8860b", text: "Limited publication in Novy Mir is what actually happened. The print run sold out in hours. 'Limited' did not stay limited. What you approved could not be controlled once it was in print." }
				}
			},
			{
				title: "Children of the Arbat",
				meta: "Anatoly Rybakov · 1966 · Novel",
				excerpt: "A novel about young Muscovites in the Stalin era. Rybakov submitted it in 1966. It was rejected. He resubmitted it every year for twenty years. Each time it crossed a desk like yours.",
				flag: "Critical portrayal of Stalin · Author has prior conviction record",
				pressure: "The novel has been on hold since 1966. It is now 1981. Rybakov resubmits annually. Each year the decision is: delay again, reject formally, or approve.",
				prompt: "This year's decision:",
				choices: [
					{ label: "Approve it, it has waited long enough", outcome: "approved" },
					{ label: "Reject it formally this time, end the cycle", outcome: "rejected" },
					{ label: "Delay again. Request additional review.", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "APPROVED", color: "#2a6", text: "You didn't. No one at your desk did. It was finally published in 1987 under Glasnost, 21 years after first submission. Rybakov submitted it every year for two decades. The desk did not win." },
					rejected: { stamp: "REJECTED", color: "#c33", text: "Formal rejection would have ended the cycle. Instead desks like yours preferred the fiction of 'under review.' The book existed. Rybakov knew it. He kept submitting." },
					altered: { stamp: "DELAYED", color: "#b8860b", text: "Again. This is the 15th consecutive delay. The manuscript has outlasted three of the reviewers who first evaluated it. 'Additional review' is a system that prefers to wait rather than decide." }
				}
			},
			{
				title: "The Gulag Archipelago",
				meta: "Alexander Solzhenitsyn · 1973 · History/Testimony",
				excerpt: "A documented history of the Soviet forced labor camp system, compiled from 227 firsthand testimonies. Solzhenitsyn kept no physical copy in the USSR. The only complete manuscript was in the West.",
				flag: "Direct documentation of Gulag system · Author is under state surveillance",
				pressure: "The KGB has tortured one of Solzhenitsyn's typists into revealing the manuscript's existence. A copy is being held in Paris, ready to publish. You have 48 hours before they release it. Arrest the author, or let it go.",
				prompt: "Your recommendation:",
				choices: [
					{ label: "Do nothing, arresting him makes it worse", outcome: "approved" },
					{ label: "Arrest him immediately", outcome: "rejected" },
					{ label: "Expel him from the Soviet Union", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "NO ACTION", color: "#2a6", text: "Doing nothing was not the choice made. Solzhenitsyn was arrested and expelled in 1974. The book was published in Paris in 1973. The arrest confirmed everything in it. The book could not be unwritten." },
					rejected: { stamp: "ARRESTED", color: "#c33", text: "He was arrested and expelled in February 1974. The Paris edition had already been released. Arrest turned him into an international symbol of Soviet repression. The book spread faster." },
					altered: { stamp: "EXPELLED", color: "#b8860b", text: "This is what actually happened. He was expelled to West Germany. The Gulag Archipelago was already in print in Paris. Expulsion made him a permanent dissident voice, outside the reach of your desk." }
				}
			},
			{
				title: "Doctor Zhivago",
				meta: "Boris Pasternak · 1957 · Novel",
				excerpt: "A novel about love, revolution, and survival across the Soviet era. Rejected by Soviet publishers. Smuggled to an Italian publisher. Won the Nobel Prize. Pasternak was ordered to refuse it.",
				flag: "Published abroad without authorization · Nobel Prize, politically sensitive",
				pressure: "The Nobel Committee has announced the prize. Pasternak wants to accept it. The Writers' Union has expelled him. If he travels to Stockholm, it is a global embarrassment. If he stays, it is a suppression the world is watching.",
				prompt: "What do you recommend the state do?",
				choices: [
					{ label: "Allow him to accept the prize, the suppression is worse than the book", outcome: "approved" },
					{ label: "Threaten exile if he accepts, he will decline", outcome: "rejected" },
					{ label: "Let him accept; quietly continue to suppress the book at home", outcome: "altered" }
				],
				consequences: {
					approved: { stamp: "RECOMMENDED", color: "#2a6", text: "This was not the recommendation given. He was threatened with exile if he accepted. He declined the prize. He died in 1960, the book still banned in the USSR. He never left. He never saw it published at home." },
					rejected: { stamp: "COERCED", color: "#c33", text: "The threat worked. He declined the Nobel Prize under duress. He wrote to Khrushchev: 'Leaving my homeland is for me equivalent to death.' He was allowed to stay, and to die quietly, in 1960. Doctor Zhivago was published in the USSR in 1988." },
					altered: { stamp: "CONTROLLED", color: "#b8860b", text: "Selective suppression rarely stays selective. The book was already in global circulation. The CIA had arranged mass distribution of Russian-language editions. Controlling the domestic archive while the world read it freely was a distinction without a difference." }
				}
			}
		]
	};

	//  state for chosen role, current case, and logged decisions

	let currentRole = null;
	let currentCaseIndex = 0;
	let choicesMade = [];

	//  references cached once so rendering stays readable

	const roleScreen = modal.querySelector('#books-role-screen');
	const playScreen = modal.querySelector('#books-play-screen');
	const summaryScreen = modal.querySelector('#books-summary-screen');

	const docTitle = modal.querySelector('#books-doc-title');
	const docMeta = modal.querySelector('#books-doc-meta');
	const docExcerpt = modal.querySelector('#books-doc-excerpt');
	const docFlag = modal.querySelector('#books-doc-flag');
	const pressureText = modal.querySelector('#books-pressure-text');
	const decisionBtns = modal.querySelector('#books-decision-btns');
	const consequenceBox = modal.querySelector('#books-consequence');
	const stampArea = modal.querySelector('#books-stamp-area');
	const stepCounter = modal.querySelector('#books-step-counter');
	const prevBtn = modal.querySelector('#books-prev-btn');
	const nextBtn = modal.querySelector('#books-next-btn');
	const finishBtn = modal.querySelector('#books-finish-btn');
	const progressFill = modal.querySelector('#books-progress-fill');
	const summaryLedger = modal.querySelector('#books-summary-ledger');
	const summaryReflection = modal.querySelector('#books-summary-reflection');
	const summaryRoleLabel = modal.querySelector('#books-summary-role-label');

	// screen switching, case rendering, choice handling, summary building

	function showScreen(screen) {
		[roleScreen, playScreen, summaryScreen].forEach(s => s.classList.remove('active'));
		screen.classList.add('active');
	}

	function showCaseOutcome(choiceData, index) {
		const { result } = choiceData;
		const stamp = document.createElement('div');
		stamp.className = 'books-game-stamp';
		stamp.textContent = result.stamp;
		stamp.style.color = result.color;
		stamp.style.borderColor = result.color;
		stampArea.innerHTML = '';
		stampArea.appendChild(stamp);

		consequenceBox.innerHTML = `<p>${result.text}</p>`;
		consequenceBox.className = 'books-game-consequence visible';

		decisionBtns.querySelectorAll('.books-game-choice-btn').forEach(btn => {
			btn.disabled = true;
		});

		if (index < cases[currentRole].length - 1) {
			nextBtn.style.display = 'inline-block';
			finishBtn.style.display = 'none';
		} else {
			nextBtn.style.display = 'none';
			finishBtn.style.display = 'inline-block';
			progressFill.style.width = '100%';
		}
	}

	function loadCase(index) {
		currentCaseIndex = index;
		const c = cases[currentRole][index];
		const savedChoice = choicesMade[index];

		consequenceBox.innerHTML = '';
		consequenceBox.className = 'books-game-consequence';
		stampArea.innerHTML = '';
		nextBtn.style.display = 'none';
		finishBtn.style.display = 'none';
		prevBtn.disabled = index === 0;

		docTitle.textContent = c.title;
		docMeta.textContent = c.meta;
		docExcerpt.textContent = c.excerpt;
		docFlag.innerHTML = `<span class="books-flag-label">⚑ ${c.flag}</span>`;
		pressureText.textContent = c.pressure;
		stepCounter.textContent = `Case ${index + 1} of ${cases[currentRole].length}`;
		progressFill.style.width = `${(index / cases[currentRole].length) * 100}%`;

		decisionBtns.innerHTML = '';
		c.choices.forEach(ch => {
			const btn = document.createElement('button');
			btn.className = 'books-game-choice-btn';
			if (savedChoice && savedChoice.outcome === ch.outcome) {
				btn.classList.add('is-selected');
			}
			btn.textContent = ch.label;
			btn.addEventListener('click', () => handleChoice(ch.outcome, index));
			decisionBtns.appendChild(btn);
		});

		if (savedChoice) {
			showCaseOutcome(savedChoice, index);
		}
	}

	function handleChoice(outcome, index) {
		const c = cases[currentRole][index];
		const result = c.consequences[outcome];
		const choiceData = { outcome, result, title: c.title };
		choicesMade[index] = choiceData;

		decisionBtns.querySelectorAll('.books-game-choice-btn').forEach(btn => btn.classList.remove('is-selected'));
		const selectedIndex = c.choices.findIndex(choice => choice.outcome === outcome);
		const selectedBtn = decisionBtns.children[selectedIndex];
		if (selectedBtn) selectedBtn.classList.add('is-selected');

		showCaseOutcome(choiceData, index);
	}

	function buildSummary() {
		const roleLabels = { publisher: 'The Publisher · New York, 1968', librarian: 'The Librarian · Alabama, 2023', official: 'The Censor · Soviet Union, 1937' };
		summaryRoleLabel.textContent = roleLabels[currentRole];

		let approvedCount = choicesMade.filter(c => c.outcome === 'approved').length;
		let rejectedCount = choicesMade.filter(c => c.outcome === 'rejected').length;
		let alteredCount = choicesMade.filter(c => c.outcome === 'altered').length;

		summaryLedger.innerHTML = choicesMade.map(c => `
			<div class="books-summary-row">
				<span class="books-summary-row-title">${c.title}</span>
				<span class="books-summary-row-stamp" style="color:${c.result.color};border-color:${c.result.color}">${c.result.stamp}</span>
			</div>
		`).join('');

		const reflections = {
			publisher: {
				all_approved: "You published everything that crossed your desk. Six books, some of them the most important of the 20th century, reached readers because you let them through. That took something.",
				all_rejected: "You built a safe list. None of those books caused you problems. None of them changed anything either.",
				mixed: `${approvedCount} published. ${rejectedCount} rejected. ${alteredCount > 0 ? alteredCount + ' altered.' : ''} An archive is built one decision at a time. So is a silence.`,
			},
			librarian: {
				all_approved: "Every book stayed. Every reader who needed one of these titles could find it. That is what a library is for.",
				all_rejected: "Every book you removed was removed for someone's comfort, not the readers', but the complainants'. Libraries serve readers, not petitions.",
				mixed: `${approvedCount} retained. ${rejectedCount} removed. ${alteredCount > 0 ? alteredCount + ' restricted.' : ''} Restriction and removal are not the same thing. Neither is access and availability. The gaps in your collection are a record too.`,
			},
			official: {
				all_approved: "You approved them all. At a desk like yours, in a system like this, that was not possible. These are hypotheticals. The real desk approved nothing.",
				all_rejected: "Every manuscript stopped. And yet: Bulgakov's wife kept a copy. Akhmatova's friends memorized the poems. Rybakov resubmitted for 21 years. The desk did not win.",
				mixed: `${approvedCount} approved. ${rejectedCount} rejected. ${alteredCount > 0 ? alteredCount + ' controlled.' : ''} The archive of Soviet censorship is its own kind of record, not of what was suppressed, but of what survived anyway.`,
			}
		};

		const refl = reflections[currentRole];
		let reflText;
		if (rejectedCount === 0 && alteredCount === 0) reflText = refl.all_approved;
		else if (approvedCount === 0 && alteredCount === 0) reflText = refl.all_rejected;
		else reflText = refl.mixed;

		summaryReflection.innerHTML = `<p>${reflText}</p>`;
	}

	// role pick, previous/next case, finish flow, restart, close.

	modal.querySelectorAll('.books-game-role-card').forEach(card => {
		card.addEventListener('click', () => {
			currentRole = card.dataset.role;
			currentCaseIndex = 0;
			choicesMade = [];
			showScreen(playScreen);
			loadCase(0);
		});
	});

	prevBtn.addEventListener('click', () => {
		if (currentCaseIndex === 0) return;
		loadCase(currentCaseIndex - 1);
	});

	nextBtn.addEventListener('click', () => {
		currentCaseIndex++;
		loadCase(currentCaseIndex);
	});

	finishBtn.addEventListener('click', () => {
		buildSummary();
		showScreen(summaryScreen);
	});

	modal.querySelector('#books-restart-btn').addEventListener('click', () => {
		currentRole = null;
		currentCaseIndex = 0;
		choicesMade = [];
		showScreen(roleScreen);
	});

	modal.querySelector('.books-game-close').addEventListener('click', () => {
		modal.remove();
	});

	document.body.appendChild(modal);
	modal.style.display = 'flex';
}

// "The Map Room" :
// you step into imperial decision moments and choose what happens next
// make it clear these outcomes came from choices people made,
// not from history just "naturally" unfolding.

function openEmpiresGame() {
	const existingModal = document.getElementById('empires-game-modal-custom');
	if (existingModal) existingModal.remove();

	const modal = document.createElement('div');
	modal.id = 'empires-game-modal-custom';
	modal.className = 'day-in-life-modal';

	modal.innerHTML = `
		<div class="empires-game-modal-content">

			<!-- HEADER -->
			<div class="empires-game-header">
				<div>
					<h3 class="empires-game-title">The Map Room</h3>
					<p class="empires-game-subtitle">You hold the pen. The lines you draw will outlast everyone in this room.</p>
				</div>
				<button class="empires-game-close">✕</button>
			</div>

			<!-- PLAY SCREEN -->
			<div class="empires-game-screen active" id="empires-play-screen">

				<div class="empires-game-progress-bar">
					<div class="empires-game-progress-fill" id="empires-progress-fill" style="width:0%"></div>
				</div>

				<div class="empires-game-year-badge" id="empires-year-badge">1884</div>

				<div class="empires-game-room">

					<!-- Left: situation brief -->
					<div class="empires-game-brief">
						<div class="empires-game-brief-location" id="empires-location">,</div>
						<div class="empires-game-brief-title" id="empires-brief-title">,</div>
						<div class="empires-game-brief-body" id="empires-brief-body">,</div>
						<div class="empires-game-voices" id="empires-voices"></div>
					</div>

					<!-- Right: decision -->
					<div class="empires-game-decision-panel">
						<div class="empires-game-decision-header">Your decision:</div>
						<div class="empires-game-decision-btns" id="empires-decision-btns"></div>
						<div class="empires-game-consequence-box" id="empires-consequence-box">
							<div class="empires-game-consequence-text" id="empires-consequence-text"></div>
							<div class="empires-game-consequence-legacy" id="empires-consequence-legacy"></div>
						</div>
					</div>
				</div>

				<div class="empires-game-step-counter" id="empires-step-counter">Decision 1 of 6</div>
				<div class="empires-game-nav">
					<button class="empires-game-nav-btn" id="empires-prev-btn" disabled>← Prev</button>
					<button class="empires-game-nav-btn primary" id="empires-next-btn" style="display:none;">Next →</button>
					<button class="empires-game-nav-btn finish" id="empires-finish-btn" style="display:none;">See the Legacy →</button>
				</div>
			</div>

			<!-- SUMMARY SCREEN -->
			<div class="empires-game-screen" id="empires-summary-screen">
				<div class="empires-game-summary-title">The Legacy of the Map Room</div>
				<div class="empires-game-summary-sub">Berlin Conference, 1884,1885 · Six decisions · Consequences still unfolding</div>

				<div class="empires-game-legacy-board" id="empires-legacy-board"></div>

				<div class="empires-game-summary-reflection">
					<p id="empires-final-reflection">,</p>
				</div>

				<div class="empires-game-summary-quote">
					<p>"Africa will write its own history and both north and south of the Sahara it will be a history full of glory and dignity."</p>
					<span>, Patrice Lumumba, final letter, 1961</span>
				</div>

				<div class="empires-game-summary-now">
					<div class="empires-game-summary-now-label">Still in the archive today:</div>
					<ul>
						<li>The Berlin Conference map remains the basis for 44 of 54 African national borders.</li>
						<li>The Congo Free State rubber quota system killed an estimated 10 million people.</li>
						<li>The Sykes-Picot lines of 1916 continue to shape conflict in the Middle East.</li>
						<li>Patrice Lumumba's letter was suppressed for decades. It was published from a copy kept outside state archives.</li>
					</ul>
				</div>

				<button class="empires-game-nav-btn" id="empires-restart-btn">↺ Start Over</button>
			</div>

		</div>
	`;

	document.body.appendChild(modal);

	// Scenarios, each item includes setup, choices, and consequences.

	const decisions = [
		{
			year: "1884",
			location: "Berlin Conference Table",
			title: "Drawing the Congo Basin",
			body: "You must determine the boundaries of the Congo Basin, a territory the size of Western Europe, home to dozens of distinct ethnic groups, kingdoms, and political systems. No African representative is in this room. King Leopold II of Belgium has claimed it as his personal property. The other powers are negotiating their shares of the continent.",
			voices: [
				{ speaker: "Leopold II", text: "The Congo requires civilizing administration. I offer to bear this burden personally, as a humanitarian mission." },
				{ speaker: "British delegate", text: "The basin must remain open to free trade. We cannot allow one power to monopolize the river." }
			],
			choices: [
				{ label: "Award the Congo to Leopold as the 'Congo Free State'", outcome: "a" },
				{ label: "Declare it a neutral free-trade zone with international oversight", outcome: "b" },
				{ label: "Require any claim to prove 'effective occupation' with treaty documentation", outcome: "c" }
			],
			consequences: {
				a: { label: "Awarded to Leopold", immediate: "Leopold's 'humanitarian mission' becomes a rubber extraction regime. A quota system requiring each village to produce a set amount of rubber is enforced through amputation of hands for shortfalls. By 1908, an estimated 10 million people have died. The conference room considered this a successful outcome.", legacy: "The Congo Free State is the documented origin of what Adam Hochschild called 'the first great human rights movement of the 20th century', not to liberate the Congo, but to expose what was being done there." },
				b: { label: "Neutral zone declared", immediate: "Neutral zone status reduces Leopold's monopoly but does not remove European commercial interest. The rubber extraction continues under different flags. The administrative language changes. The system does not.", legacy: "Neutrality without sovereignty is a form of permanent administration. Free trade zones created by imperial powers tend to remain free for the powers that created them." },
				c: { label: "'Effective occupation' required", immediate: "The principle of effective occupation sounds procedural. In practice it accelerates the land grab: European powers rush to sign treaties with local leaders they have not met, using documents in languages those leaders cannot read. More territory is claimed faster.", legacy: "The effective occupation principle was adopted. It created the legal machinery for the fastest territorial annexation in recorded history. Between 1880 and 1900, European powers claimed 90% of the African continent." }
			}
		},
		{
			year: "1885",
			location: "Colonial Administration Office, Nairobi",
			title: "Naming the Territory",
			body: "The region your government controls contains communities who have named these rivers, mountains, and plains for centuries. Your administration needs a single map for tax collection, military movement, and resource tracking. The existing names are inconsistent, or rather, they are in seven languages your cartographers cannot transliterate uniformly.",
			voices: [
				{ speaker: "Colonial cartographer", text: "We need standardized place names. What we cannot map, we cannot administer." },
				{ speaker: "Local administrator", text: "The people here know this river as Nyanza. We have been calling it Lake Victoria for six months. Neither they nor our maps agree on where it ends." }
			],
			choices: [
				{ label: "Rename everything in the colonial language, one map, one system", outcome: "a" },
				{ label: "Attempt phonetic transliterations of existing names where possible", outcome: "b" },
				{ label: "Use colonial names in official records; record indigenous names in a parallel register", outcome: "c" }
			],
			consequences: {
				a: { label: "Full renaming", immediate: "The map is clean and consistent. Administration becomes efficient. The names of the Kikuyu, Maasai, and Luo communities for their own territories, their embedded records of ownership, seasonal routes, and sacred sites, become officially invisible.", legacy: "Place names are memory systems. Renaming a landscape is an act of archival erasure. The effort to restore pre-colonial place names (Bombay → Mumbai, Rhodesia → Zimbabwe) is still ongoing and politically contested a century later." },
				b: { label: "Phonetic transliteration", immediate: "The transliterations are inconsistent, reflecting the home languages of whoever did the transliterating. Some names survive. Many are unrecognizably distorted. The map is a record of partial hearing.", legacy: "Phonetic transliteration by colonial administrators produced place names that are still contested, spellings that encode mispronunciation, names that displaced alternative names of equal or greater historical depth." },
				c: { label: "Parallel register", immediate: "Two systems are now maintained. The official map uses colonial names. The parallel register is a colonial document, created by colonial administrators, reflecting their selection of which indigenous names to record. It is not the same as the communities' own maps.", legacy: "Parallel registers tend to be archived, and then unfunded, and then lost. The official map persists. The parallel register became the exception that justified the rule." }
			}
		},
		{
			year: "1895",
			location: "Matabeleland, Southern Africa",
			title: "The Concession",
			body: "Cecil Rhodes's British South Africa Company holds a 'concession' from King Lobengula of the Ndebele, a document Lobengula says granted only the right to dig in one location. The Company claims it grants rights to the entire territory. Lobengula cannot read English. The document is in English. Your office must rule on its validity.",
			voices: [
				{ speaker: "BSAC Legal Counsel", text: "The concession is a legal document, properly executed. The king placed his mark upon it." },
				{ speaker: "Missionary observer", text: "Lobengula has stated repeatedly that he did not understand what he was signing. He thought it was a permit for ten men to dig. He did not grant a country." }
			],
			choices: [
				{ label: "Validate the concession, it was signed and is legally binding", outcome: "a" },
				{ label: "Invalidate it, consent requires comprehension", outcome: "b" },
				{ label: "Validate it with conditions: limit BSAC operations to specified areas", outcome: "c" }
			],
			consequences: {
				a: { label: "Concession validated", immediate: "The BSAC administers the territory. The Ndebele are displaced from their lands. When Lobengula resists, a military campaign is launched. The Rudd Concession, the document in dispute, becomes the legal basis for what will eventually be called Rhodesia.", legacy: "The concession model, using signed but not understood documents to claim sovereignty, was used across colonial Africa. Courts in the metropole consistently validated them. The legal record of empire is full of signatures that meant different things to each party." },
				b: { label: "Concession invalidated", immediate: "This is not what happened. No colonial court invalidated a major concession on grounds of comprehension. The hypothetical asks you to imagine a colonial legal system that prioritized indigenous understanding over settler acquisition. That system did not exist.", legacy: "The question of whether colonized people could give meaningful informed consent to treaties written in languages they did not speak was never seriously adjudicated by colonial courts. It is still being litigated, in different forms, in land rights cases today." },
				c: { label: "Validated with conditions", immediate: "Conditions are attached to the paper. They are not enforced. The BSAC's resources vastly exceed the colonial office's capacity for oversight. Conditions that cannot be enforced are conditions that do not exist.", legacy: "Conditional validation was a common colonial administrative technique. It allowed officials to record a procedural objection while permitting the underlying extraction to proceed. The conditions are in the archive. The extraction is also in the archive." }
			}
		},
		{
			year: "1916",
			location: "London, Sykes-Picot Negotiation",
			title: "The Line Through the Middle",
			body: "Britain and France are dividing the Arab provinces of the Ottoman Empire, territory where the British have simultaneously promised Arab leaders an independent Arab state in exchange for revolt against the Ottomans. You must draw the line. There is a map in front of you. The pencil is already in your hand.",
			voices: [
				{ speaker: "Mark Sykes (British)", text: "I should like to draw a line from the 'e' in Acre to the last 'k' in Kirkuk." },
				{ speaker: "François Georges-Picot (French)", text: "France requires direct control of the Syrian littoral and indirect influence in the interior." },
				{ speaker: "Absent voice", text: "Sherif Hussein of Mecca has been promised Arab independence in exchange for the Arab Revolt. He is not in this room." }
			],
			choices: [
				{ label: "Draw the line as agreed, Sykes-Picot division stands", outcome: "a" },
				{ label: "Pause. Honor the promise to Sherif Hussein first.", outcome: "b" },
				{ label: "Draw the line, but leave a buffer zone for future Arab administration", outcome: "c" }
			],
			consequences: {
				a: { label: "Lines drawn as agreed", immediate: "The agreement is signed in secret. The Arab leaders who launched the revolt based on promises of independence learn of it only when it is leaked by the Bolsheviks in 1917, who found it in the Russian imperial archives. The sense of betrayal is permanent.", legacy: "The Sykes-Picot lines created borders that divided the Kurdish population across four states, placed Sunni and Shia communities under single administrations without consultation, and split tribal and family networks. These borders are still being contested, militarily and politically, in the 21st century." },
				b: { label: "Pause, honor the promise", immediate: "This pause did not happen. It is useful as a hypothetical because it shows that the decision to betray the promise was a decision, not an inevitability. Someone in that room could have said: we made a promise. They did not.", legacy: "The gap between the promises made and the agreement signed is documented in the archives of both countries. It was known at the time. The betrayal was not an oversight. It was a calculation about which commitments were worth keeping." },
				c: { label: "Buffer zone created", immediate: "Buffer zones in imperial cartography tend to become contested zones. A space defined as transitional rarely stays transitional. Both powers will eventually press their claims into it.", legacy: "The concept of a 'managed transition zone' in colonial cartography produced some of the most enduringly unstable regions on the modern map, areas where competing claims were deferred rather than resolved, generating conflict across generations." }
			}
		},
		{
			year: "1959",
			location: "Léopoldville, Belgian Congo",
			title: "The Independence File",
			body: "The Belgian Congo is moving toward formal independence. Patrice Lumumba, elected Prime Minister in the first free elections, has publicly called for an end to colonial economic structures and the nationalization of Belgian mineral interests. Your government must decide what relationship independent Congo will have with its former colonial administration, and with Lumumba.",
			voices: [
				{ speaker: "Belgian colonial administrator", text: "Economic continuity is non-negotiable. Belgian companies control 70% of Congo's extractive industry. That structure must be preserved post-independence." },
				{ speaker: "Lumumba (reported speech)", text: "We are no longer your monkeys. Our Congo is not a business. It belongs to the Congolese." },
				{ speaker: "CIA station chief", text: "Lumumba has approached the Soviets. He is a security threat. We are recommending removal." }
			],
			choices: [
				{ label: "Recognize Lumumba's government and negotiate economic terms", outcome: "a" },
				{ label: "Support his removal, back a more cooperative successor", outcome: "b" },
				{ label: "Grant formal independence but maintain Belgian military and economic control", outcome: "c" }
			],
			consequences: {
				a: { label: "Recognized, negotiations begin", immediate: "Negotiation would have required Belgium and the US to accept reduced control over Congolese resources. This was not the choice made. Lumumba was overthrown with Belgian and US involvement within months of independence.", legacy: "The hypothetical of a negotiated post-colonial relationship exists to make the actual decision more legible. The choice to remove him was not forced by circumstances. It was a choice, made by identifiable people in identifiable rooms, with identifiable financial interests." },
				b: { label: "Lumumba removed", immediate: "Lumumba was arrested, transferred to Katanga province, and executed in January 1961. Mobutu Sese Seko, backed by Belgium and the CIA, took power. Belgian mineral interests were protected. The copper, cobalt, and uranium continued to flow.", legacy: "The CIA's involvement in Lumumba's assassination was confirmed in declassified documents. His final letter to his wife, written from captivity, was suppressed. It survived in copies kept outside official archives. It is now among the most important documents of anti-colonial resistance." },
				c: { label: "Formal independence, retained control", immediate: "This is closer to what actually happened. Independence was granted on paper. Belgian military and advisors remained. The Congolese army's officer corps was all-Belgian on independence day. Formal independence without structural sovereignty is a particular kind of archive entry.", legacy: "The persistence of economic extraction through post-colonial mechanisms, retained military presence, currency ties, corporate control, is what critics of neo-colonialism documented in the decade after African independence. The paperwork says independence. The ledger says otherwise." }
			}
		},
		{
			year: "1994",
			location: "Kigali, Rwanda",
			title: "The Radio Tower",
			body: "Radio Mille Collines is broadcasting calls to kill Tutsi civilians. The genocide has begun. The UN peacekeeping force present in Rwanda has requested permission to act. The UN Security Council is meeting. US officials have been instructed not to use the word 'genocide' because it would trigger legal obligations to intervene. You are in the room where the language is being decided.",
			voices: [
				{ speaker: "US State Department memo", text: "Be careful. Genocide finding could commit USG to actually 'do something.'" },
				{ speaker: "General Roméo Dallaire (UN Commander)", text: "I can stop this. Give me the mandate and 5,000 troops." },
				{ speaker: "Security Council proceduralist", text: "The mandate does not cover internal conflict of this nature." }
			],
			choices: [
				{ label: "Name it genocide. Authorize intervention.", outcome: "a" },
				{ label: "Use the State Department's language, 'acts of genocide may have occurred'", outcome: "b" },
				{ label: "Withdraw UN forces entirely to avoid entanglement", outcome: "c" }
			],
			consequences: {
				a: { label: "Authorized, 'genocide' named", immediate: "This authorization was not given. Dallaire estimated that 5,000 troops with a robust mandate could have stopped the killing. He had a plan. He was given the opposite, his force was reduced.", legacy: "The genocide killed approximately 800,000 people in 100 days. The decision not to intervene was not an absence of decision, it was a decision. The language used in Security Council chambers, the specific instruction not to say 'genocide,' is in the documentary record." },
				b: { label: "'Acts of genocide may have occurred'", immediate: "This is what actually happened. The State Department spokeswoman Christine Shelley used this phrasing under instruction on May 25, 1994, six weeks into the genocide. The language was a legal strategy to avoid obligation. It was successful.", legacy: "The Rwanda genocide is now a standard case study in how bureaucratic language functions as a tool of deliberate inaction. The words chosen in that briefing room are still quoted in international law scholarship as a model of what legally precise evasion looks like." },
				c: { label: "UN forces withdrawn", immediate: "This is also what happened. The Security Council voted on April 21, 1994, days into the genocide, to reduce Dallaire's force from 2,500 to 270 troops. The Belgian contingent was withdrawn entirely after 10 Belgian peacekeepers were killed.", legacy: "Dallaire has said publicly that the 270 troops who remained saved an estimated 32,000 lives through improvised protection of civilian sites. The reduction vote is in the Security Council record. The name of every country that voted for it is also in the record." }
			}
		}
	];

	// state for current decision step, what the player has chosen so far

	let currentDecisionIndex = 0;
	let choicesMade = [];

	// Cached DOM references for screens, dynamic elements, and buttons

	const introScreen = modal.querySelector('#empires-intro-screen');
	const playScreen = modal.querySelector('#empires-play-screen');
	const summaryScreen = modal.querySelector('#empires-summary-screen');

	const yearBadge = modal.querySelector('#empires-year-badge');
	const locationEl = modal.querySelector('#empires-location');
	const briefTitle = modal.querySelector('#empires-brief-title');
	const briefBody = modal.querySelector('#empires-brief-body');
	const voicesEl = modal.querySelector('#empires-voices');
	const decisionBtns = modal.querySelector('#empires-decision-btns');
	const consequenceBox = modal.querySelector('#empires-consequence-box');
	const consequenceText = modal.querySelector('#empires-consequence-text');
	const consequenceLegacy = modal.querySelector('#empires-consequence-legacy');
	const stepCounter = modal.querySelector('#empires-step-counter');
	const prevBtn = modal.querySelector('#empires-prev-btn');
	const nextBtn = modal.querySelector('#empires-next-btn');
	const finishBtn = modal.querySelector('#empires-finish-btn');
	const progressFill = modal.querySelector('#empires-progress-fill');
	const legacyBoard = modal.querySelector('#empires-legacy-board');
	const finalReflection = modal.querySelector('#empires-final-reflection');

	// screen switching, card rendering, and summary generation

	function showScreen(screen) {
		[introScreen, playScreen, summaryScreen].filter(Boolean).forEach(s => s.classList.remove('active'));
		screen.classList.add('active');
	}

	function showDecisionOutcome(result, index) {
		consequenceText.textContent = result.immediate;
		consequenceLegacy.innerHTML = `<strong>In the archive:</strong> ${result.legacy}`;
		consequenceBox.classList.add('visible');

		if (index < decisions.length - 1) {
			nextBtn.style.display = 'inline-block';
			finishBtn.style.display = 'none';
		} else {
			nextBtn.style.display = 'none';
			finishBtn.style.display = 'inline-block';
			progressFill.style.width = '100%';
		}
	}

	function loadDecision(index) {
		currentDecisionIndex = index;
		const d = decisions[index];
		const savedChoice = choicesMade[index];

		consequenceBox.classList.remove('visible');
		consequenceText.textContent = '';
		consequenceLegacy.textContent = '';
		nextBtn.style.display = 'none';
		finishBtn.style.display = 'none';
		prevBtn.disabled = index === 0;

		yearBadge.textContent = d.year;
		locationEl.textContent = d.location;
		briefTitle.textContent = d.title;
		briefBody.textContent = d.body;
		stepCounter.textContent = `Decision ${index + 1} of ${decisions.length}`;
		progressFill.style.width = `${(index / decisions.length) * 100}%`;

		voicesEl.innerHTML = d.voices.map(v => `
			<div class="empires-game-voice">
				<span class="empires-voice-speaker">${v.speaker}:</span>
				<span class="empires-voice-text">${v.text}</span>
			</div>
		`).join('');

		decisionBtns.innerHTML = '';
		d.choices.forEach(ch => {
			const btn = document.createElement('button');
			btn.className = 'empires-game-choice-btn';
			if (savedChoice && savedChoice.outcome === ch.outcome) {
				btn.classList.add('is-selected');
			}
			btn.textContent = ch.label;
			btn.addEventListener('click', () => handleDecision(ch.outcome, index));
			decisionBtns.appendChild(btn);
		});

		if (savedChoice) {
			showDecisionOutcome(savedChoice, index);
		}
	}

	function handleDecision(outcome, index) {
		const d = decisions[index];
		const result = d.consequences[outcome];

		choicesMade[index] = {
			title: d.title,
			year: d.year,
			label: result.label,
			immediate: result.immediate,
			legacy: result.legacy,
			outcome
		};

		decisionBtns.querySelectorAll('.empires-game-choice-btn').forEach(btn => btn.classList.remove('is-selected'));
		const selectedIndex = d.choices.findIndex(choice => choice.outcome === outcome);
		const selectedBtn = decisionBtns.children[selectedIndex];
		if (selectedBtn) selectedBtn.classList.add('is-selected');

		showDecisionOutcome(choicesMade[index], index);
	}

	function buildSummary() {
		legacyBoard.innerHTML = choicesMade.filter(Boolean).map((c, i) => `
			<div class="empires-legacy-row">
				<div class="empires-legacy-year">${c.year}</div>
				<div class="empires-legacy-info">
					<div class="empires-legacy-title">${c.title}</div>
					<div class="empires-legacy-label">${c.label}</div>
				</div>
			</div>
		`).join('');

		finalReflection.textContent = "These were not six hypothetical decisions. Five of the six choices presented were the choices that were actually made, in rooms like this one, by people with pens in their hands and maps on their desks. The one that was not made, the authorization to intervene in Rwanda, the honored promise to Sherif Hussein, the invalidated concession, is presented here so that the others can be seen as what they were, decisions, not inevitabilities. The map was always an argument. The archive records who won it.";
	}

	// previous/next/finish/restart/close actions

	prevBtn.addEventListener('click', () => {
		if (currentDecisionIndex === 0) return;
		loadDecision(currentDecisionIndex - 1);
	});

	nextBtn.addEventListener('click', () => {
		currentDecisionIndex++;
		loadDecision(currentDecisionIndex);
	});

	finishBtn.addEventListener('click', () => {
		buildSummary();
		showScreen(summaryScreen);
	});

	modal.querySelector('#empires-restart-btn').addEventListener('click', () => {
		currentDecisionIndex = 0;
		choicesMade = [];
		showScreen(playScreen);
		loadDecision(0);
	});

	modal.querySelector('.empires-game-close').addEventListener('click', () => {
		modal.remove();
	});

	modal.style.display = 'flex';
	showScreen(playScreen);
	loadDecision(0);
}

function openCaseFileModal() {
	// Case File:
	// a  case-by-case walkthrough 
	const existingModal = document.getElementById('case-file-modal-custom');
	if (existingModal) existingModal.remove();

	const modal = document.createElement('div');
	modal.id = 'case-file-modal-custom';
	modal.className = 'case-file-modal';
	
	modal.innerHTML = `
		<div class="case-file-modal-content">
			<div class="case-file-header">
				<div>
					<h3 class="case-file-title">The People v. —</h3>
					<p class="case-file-subtitle">Composite cases, All names and details are fictional, Based on documented systemic patterns</p>
				</div>
				<button class="case-file-close">✕</button>
			</div>

			<div class="case-file-selector" id="case-selector">
				<button class="case-file-tab active" data-case="0">Case 001 — Marcus T.</button>
				<button class="case-file-tab" data-case="1">Case 002 — Deja W.</button>
				<button class="case-file-tab" data-case="2">Case 003 — Raymond S.</button>
				<button class="case-file-tab" data-case="3">Case 004 — Elena V.</button>
			</div>

			<div class="case-file-section-tabs" id="section-tabs">
				<button class="case-file-section-tab active" data-section="0">Background</button>
				<button class="case-file-section-tab" data-section="1">Charges</button>
				<button class="case-file-section-tab" data-section="2">Trial</button>
				<button class="case-file-section-tab locked" data-section="3">Outcome</button>
			</div>

			<div class="case-file-content-area" id="case-file-content">
				<!-- MARCUS -->
				<div class="case-file-case" data-case-id="0">
					<div class="case-file-tab-panel background-panel active">
						<div class="case-file-section-label">Background — Case 001</div>
						<div class="case-file-grid">
							<div class="case-file-field"><div class="case-file-field-label">Name</div><div class="case-file-field-value">Marcus T.</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Age at arrest</div><div class="case-file-field-value">22</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Hometown</div><div class="case-file-field-value">Baltimore, MD</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Employment</div><div class="case-file-field-value">Part-time warehouse, laid off 6 weeks prior</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Education</div><div class="case-file-field-value">High school diploma</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Prior record</div><div class="case-file-field-value highlight">None</div></div>
						</div>
						<div class="case-file-section-label">Personal History</div>
						<p class="case-file-narrative">Marcus grew up in East Baltimore with his mother and two younger siblings. His father was incarcerated when Marcus was nine. He completed high school, the first in his immediate family to do so. He was laid off from his warehouse job six weeks before his arrest when the facility reduced staff. He had applied for unemployment benefits but had not yet received them.</p>
						<div class="case-file-callout gold">↳ At the time of arrest, Marcus had $43 in his bank account.</div>
					</div>
					<div class="case-file-tab-panel charges-panel">
						<div class="case-file-section-label">Charges — Case 001</div>
						<div class="case-file-grid thirds">
							<div class="case-file-field"><div class="case-file-field-label">Primary charge</div><div class="case-file-field-value flag">Possession with intent to distribute</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Substance</div><div class="case-file-field-value">Cocaine (22 grams)</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Mandatory minimum</div><div class="case-file-field-value flag">5 years federal</div></div>
						</div>
						<div class="case-file-section-label">Circumstances of Arrest</div>
						<p class="case-file-narrative">Marcus was stopped during a pedestrian stop near his apartment. Officers stated he matched the description of a suspect in an unrelated incident. A search of his jacket revealed 22 grams of cocaine. Marcus stated the jacket was borrowed from a cousin and that he was unaware of the contents. His cousin was not charged. No surveillance footage of the stop exists. The arresting officers' body cameras were not activated.</p>
						<div class="case-file-callout red">↳ The "matching description" stop has been flagged by Marcus's public defender as potentially unconstitutional, but challenging it will delay proceedings by months with no guarantee of dismissal.</div>
					</div>
					<div class="case-file-tab-panel trial-panel">
						<div class="case-file-section-label">Trial — Decision Point</div>
						<p class="case-file-narrative">Marcus has been assigned a public defender with an active caseload of 147 cases. She has met with Marcus twice, for a combined total of 35 minutes. She advises him honestly, the evidence is circumstantial but the mandatory minimum means a trial conviction carries severe risk.</p>
						<div class="case-file-callout">↳ The prosecutor offers a plea deal, plead guilty to simple possession, serve 18 months, 3 years probation. No trial.</div>
						<p class="case-file-narrative">If Marcus rejects the plea and goes to trial, and is convicted on the original charge, he faces a mandatory minimum of five years, with no judicial discretion to reduce it, regardless of circumstances.</p>
						<div class="case-file-decision-panel" data-case="0">
							<div class="case-file-decision-question">You are Marcus's advisor. What do you counsel him to do?</div>
							<div class="case-file-decision-options">
								<button class="case-file-decision-btn" data-choice="plea"><span class="case-file-opt-label">Option A</span><span class="case-file-opt-text">Accept the plea deal, 18 months, avoid the risk of 5 years</span></button>
								<button class="case-file-decision-btn" data-choice="trial"><span class="case-file-opt-label">Option B</span><span class="case-file-opt-text">Go to trial, fight the constitutionality of the stop</span></button>
								<button class="case-file-decision-btn" data-choice="delay"><span class="case-file-opt-label">Option C</span><span class="case-file-opt-text">Request more time to build a defense</span></button>
							</div>
						</div>
					</div>
					<div class="case-file-tab-panel outcome-panel">
						<div class="case-file-section-label">Outcome — Case 001</div>
						<div class="case-file-outcome-block" data-outcome="plea">
							<div class="case-file-outcome-stamp plea">Guilty Plea, Accepted</div>
							<p class="case-file-narrative">Marcus accepted the plea deal. He was sentenced to 18 months at a federal facility 340 miles from his family. His mother could not afford to visit. Marcus was released after 14 months with good behavior. He received no re-entry support. Because of his conviction, he was disqualified from federal housing assistance and most job training programs. He is currently on probation.</p>
							<div class="case-file-callout gold">↳ What you chose is what most people choose. 97% of federal convictions result from plea deals, not trials.</div>
							<div class="case-file-factors-panel">
								<div class="case-file-factors-title">Systemic factors at work</div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">97%</div><div class="case-file-factor-text">Of federal criminal convictions result from guilty pleas, not trials, a system critics call "plea bargaining coercion."</div></div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">147</div><div class="case-file-factor-text">Cases carried by Marcus's public defender. The ABA recommends a maximum of 150. Effective representation is near-impossible at this caseload.</div></div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">44%</div><div class="case-file-factor-text">Of people released from federal prison experience unemployment in the first year due to conviction-based disqualifications.</div></div>
							</div>
							<button class="case-file-restart-btn" data-case="0">↺ Restart this case</button>
						</div>
						<div class="case-file-outcome-block" data-outcome="trial">
							<div class="case-file-outcome-stamp guilty">Convicted, 5 Years</div>
							<p class="case-file-narrative">Marcus went to trial. The constitutional challenge was denied. The jury convicted him in four hours. The mandatory minimum required the judge to sentence Marcus to five years. The judge noted in sentencing that if he had discretion, he would have sentenced Marcus to significantly less. He did not have discretion.</p>
							<div class="case-file-callout red">↳ Mandatory minimums remove judicial discretion entirely. The judge's own assessment of the case is legally irrelevant.</div>
							<div class="case-file-factors-panel">
								<div class="case-file-factors-title">Systemic factors at work</div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">5 yr</div><div class="case-file-factor-text">Mandatory minimums for drug offenses have been widely criticized for producing disproportionate sentences with no public safety benefit.</div></div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">2×</div><div class="case-file-factor-text">Black defendants are twice as likely to face mandatory minimum charges as white defendants charged with equivalent offenses, per USSC data.</div></div>
							</div>
							<button class="case-file-restart-btn" data-case="0">↺ Restart this case</button>
						</div>
						<div class="case-file-outcome-block" data-outcome="delay">
							<div class="case-file-outcome-stamp plea">Plea, After 14 Months Pretrial</div>
							<p class="case-file-narrative">While awaiting trial, Marcus was held in pretrial detention for 14 months, he could not afford the $5,000 bail. He lost his apartment. After 14 months, with no new evidence secured, he accepted the plea. The time served was credited, he was released in four months. But the 14 months of pretrial detention had already cost him nearly everything.</p>
							<div class="case-file-callout red">↳ Pretrial detention, before any conviction, is one of the most damaging elements of the system. People lose jobs, housing, and family stability while legally innocent.</div>
							<div class="case-file-factors-panel">
								<div class="case-file-factors-title">Systemic factors at work</div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">500K</div><div class="case-file-factor-text">People are held in pretrial detention on any given day in the US, most because they cannot afford bail, not because they are a flight risk.</div></div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">3×</div><div class="case-file-factor-text">People detained pretrial are three times more likely to accept a plea deal, regardless of guilt, simply to end their detention.</div></div>
							</div>
							<button class="case-file-restart-btn" data-case="0">↺ Restart this case</button>
						</div>
					</div>
				</div>

				<!-- DEJA -->
				<div class="case-file-case" data-case-id="1">
					<div class="case-file-tab-panel background-panel active">
						<div class="case-file-section-label">Background — Case 002</div>
						<div class="case-file-grid">
							<div class="case-file-field"><div class="case-file-field-label">Name</div><div class="case-file-field-value">Deja W.</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Age at arrest</div><div class="case-file-field-value">34</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Hometown</div><div class="case-file-field-value">Tulsa, OK</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Employment</div><div class="case-file-field-value">Home health aide, full-time</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Dependents</div><div class="case-file-field-value flag">Two children, ages 6 and 9. Primary caregiver.</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Prior record</div><div class="case-file-field-value">Misdemeanor theft, age 19. Probation, completed.</div></div>
						</div>
						<p class="case-file-narrative">Deja has worked as a home health aide for eight years and is the sole caregiver for her two children. She has no history of substance abuse. Her prior theft conviction at 19 involved $80 of groceries during a period of homelessness. She completed probation without incident.</p>
						<div class="case-file-callout gold">↳ Deja's employer is aware she is being held. Her position will be filled if she is not back within two weeks.</div>
					</div>
					<div class="case-file-tab-panel charges-panel">
						<div class="case-file-section-label">Charges — Case 002</div>
						<div class="case-file-grid thirds">
							<div class="case-file-field"><div class="case-file-field-label">Primary charge</div><div class="case-file-field-value flag">Aggravated assault (domestic)</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Alleged victim</div><div class="case-file-field-value">Ex-partner, R.W.</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Current bail</div><div class="case-file-field-value flag">$15,000 (cannot afford)</div></div>
						</div>
						<p class="case-file-narrative">Deja's ex-partner called 911 stating she had attacked him with a kitchen knife. Officers found him with a superficial laceration on his forearm. Deja told officers he had come to her home uninvited and threatened her, she grabbed the nearest object and he backed into it while grabbing her arm. There is a 14-month-old protective order against R.W. that he violated. He has two prior domestic violence charges in another county, both dropped.</p>
						<div class="case-file-callout red">↳ Under Oklahoma's mandatory arrest policy, when police respond to a domestic call, someone must be arrested. Deja was the one holding the knife.</div>
					</div>
					<div class="case-file-tab-panel trial-panel">
						<div class="case-file-section-label">Trial — Decision Point</div>
						<p class="case-file-narrative">Deja has been in pretrial detention for 11 days. Her public defender believes there is a strong self-defense argument, but warns the jury composition in this county is unpredictable for domestic cases with female defendants.</p>
						<div class="case-file-callout">↳ Prosecutor offers, plead guilty to simple assault (misdemeanor), time served (11 days), 12 months probation. She goes home today.</div>
						<p class="case-file-narrative">If she fights and wins, she has a clean record. If she fights and loses on the felony charge, she faces 2–5 years and loses custody of her children and her home health aide certification.</p>
						<div class="case-file-decision-panel" data-case="1">
							<div class="case-file-decision-question">You are Deja's advisor. She says, "I didn't do anything wrong. But my kids need me home." What do you counsel?</div>
							<div class="case-file-decision-options">
								<button class="case-file-decision-btn" data-choice="plea"><span class="case-file-opt-label">Option A</span><span class="case-file-opt-text">Take the plea, go home today, misdemeanor on record</span></button>
								<button class="case-file-decision-btn" data-choice="trial"><span class="case-file-opt-label">Option B</span><span class="case-file-opt-text">Fight it, self-defense is a strong argument and she did nothing wrong</span></button>
							</div>
						</div>
					</div>
					<div class="case-file-tab-panel outcome-panel">
						<div class="case-file-section-label">Outcome — Case 002</div>
						<div class="case-file-outcome-block" data-outcome="plea">
							<div class="case-file-outcome-stamp plea">Plea, Misdemeanor</div>
							<p class="case-file-narrative">Deja accepted the plea. She went home that night. Her children were in her arms by 9 PM. She kept her apartment. She lost her job, two days too late. She found new employment as a cashier at reduced pay. The misdemeanor follows her on background checks. R.W. was never charged with violating the protective order.</p>
							<div class="case-file-callout red">↳ Deja pleaded guilty to a crime she did not commit because the alternative was too dangerous. This is not an edge case.</div>
							<div class="case-file-factors-panel">
								<div class="case-file-factors-title">Systemic factors at work</div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">~30%</div><div class="case-file-factor-text">Of domestic violence arrests under mandatory arrest laws involve the survivor being arrested, particularly when they fought back.</div></div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">1 in 6</div><div class="case-file-factor-text">Exonerations involve people who pleaded guilty to crimes they did not commit, according to the National Registry of Exonerations.</div></div>
							</div>
							<button class="case-file-restart-btn" data-case="1">↺ Restart this case</button>
						</div>
						<div class="case-file-outcome-block" data-outcome="trial">
							<div class="case-file-outcome-stamp acquitted">Acquitted, Self-Defense</div>
							<p class="case-file-narrative">Deja went to trial. Her defender built a clear self-defense case. The jury acquitted her after three hours. The trial took five months. She spent four of them in pretrial detention. Her eldest missed eighteen school days. She lost her job, her apartment lease lapsed, and she and her children moved in with her mother. She was acquitted of everything and still lost almost everything.</p>
							<div class="case-file-callout red">↳ Legal innocence and material harm are not mutually exclusive. The process itself is the punishment for many people who cannot afford bail.</div>
							<div class="case-file-factors-panel">
								<div class="case-file-factors-title">Systemic factors at work</div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">5 mo</div><div class="case-file-factor-text">Average time to trial for felony cases in underfunded public defender systems, during which legally innocent people may remain jailed.</div></div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">70%</div><div class="case-file-factor-text">Of people in US jails have not been convicted of any crime, they are awaiting trial, most because they cannot afford bail.</div></div>
							</div>
							<button class="case-file-restart-btn" data-case="1">↺ Restart this case</button>
						</div>
					</div>
				</div>

				<!-- RAYMOND -->
				<div class="case-file-case" data-case-id="2">
					<div class="case-file-tab-panel background-panel active">
						<div class="case-file-section-label">Background — Case 003</div>
						<div class="case-file-grid">
							<div class="case-file-field"><div class="case-file-field-label">Name</div><div class="case-file-field-value">Raymond S.</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Age at arrest</div><div class="case-file-field-value">58</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Hometown</div><div class="case-file-field-value">Detroit, MI</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Health</div><div class="case-file-field-value flag">Schizophrenia (diagnosed 1996). Currently unmedicated.</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Housing</div><div class="case-file-field-value flag">Unhoused. Lost housing 8 months prior.</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Prior record</div><div class="case-file-field-value">4 prior arrests. All misdemeanor. All mental-health related.</div></div>
						</div>
						<p class="case-file-narrative">Raymond was a machinist for 21 years before a schizophrenia diagnosis at 37. Detroit's community mental health clinic where he received treatment closed in 2021 due to budget cuts. His four prior arrests all occurred during untreated psychotic episodes. He was jailed each time and released with no mental health follow-up.</p>
						<div class="case-file-callout gold">↳ Raymond's public defender notes he likely qualifies for mental health diversion, but the county has a six-month waitlist.</div>
					</div>
					<div class="case-file-tab-panel charges-panel">
						<div class="case-file-section-label">Charges — Case 003</div>
						<div class="case-file-grid thirds">
							<div class="case-file-field"><div class="case-file-field-label">Primary charge</div><div class="case-file-field-value flag">Felony assault (public officer)</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Circumstances</div><div class="case-file-field-value">Struck officer during removal from shelter doorway</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Injury</div><div class="case-file-field-value">Bruised forearm. No medical treatment required.</div></div>
						</div>
						<p class="case-file-narrative">Raymond was sheltering in a doorway during a winter cold snap and was in an acute psychotic episode. During the physical removal, he struck an officer in the forearm. Raymond has no memory of the incident. His public defender describes him as "entirely lucid and remorseful" now that he has received medication in custody, the longest sustained psychiatric care he has had in three years.</p>
						<div class="case-file-callout red">↳ Raymond is currently stable on medication he could not access outside. This is not uncommon.</div>
					</div>
					<div class="case-file-tab-panel trial-panel">
						<div class="case-file-section-label">Trial — Decision Point</div>
						<p class="case-file-narrative">Raymond faces felony assault of a public officer. His public defender has filed for competency evaluation and a mental health diversion referral. The prosecutor is pushing back, the officer's union wants the charge to stand as a deterrent.</p>
						<div class="case-file-callout">↳ Option, Raymond could plead guilty, accept 18 months, and receive mandated mental health treatment inside. Or wait for diversion, six months minimum, during which he remains jailed.</div>
						<div class="case-file-decision-panel" data-case="2">
							<div class="case-file-decision-question">What path gives Raymond the best chance, at justice, and at stability?</div>
							<div class="case-file-decision-options">
								<button class="case-file-decision-btn" data-choice="diversion"><span class="case-file-opt-label">Option A</span><span class="case-file-opt-text">Wait for mental health diversion, proper treatment, no conviction</span></button>
								<button class="case-file-decision-btn" data-choice="plea"><span class="case-file-opt-label">Option B</span><span class="case-file-opt-text">Accept plea and prison sentence, guaranteed treatment, 18 months</span></button>
								<button class="case-file-decision-btn" data-choice="trial"><span class="case-file-opt-label">Option C</span><span class="case-file-opt-text">Go to trial, fight the charge, argue diminished capacity</span></button>
							</div>
						</div>
					</div>
					<div class="case-file-tab-panel outcome-panel">
						<div class="case-file-section-label">Outcome — Case 003</div>
						<div class="case-file-outcome-block" data-outcome="diversion">
							<div class="case-file-outcome-stamp dismissed">Diversion, No Conviction</div>
							<p class="case-file-narrative">Raymond waited seven months for diversion. He remained jailed and medicated throughout. He completed the 12-month program at a community mental health facility. He was connected to supported housing upon release. At last contact, he had been stably housed for eight months, the longest period of stability in fifteen years.</p>
							<div class="case-file-callout gold">↳ This is the best outcome. It is also the rarest, most counties have no diversion program at all.</div>
							<div class="case-file-factors-panel">
								<div class="case-file-factors-title">Systemic factors at work</div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">2M+</div><div class="case-file-factor-text">People with serious mental illness are booked into US jails annually, more than three times the number admitted to psychiatric hospitals.</div></div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">17%</div><div class="case-file-factor-text">Of US counties have a dedicated mental health diversion program. Most people in Raymond's situation have no alternative path.</div></div>
							</div>
							<button class="case-file-restart-btn" data-case="2">↺ Restart this case</button>
						</div>
						<div class="case-file-outcome-block" data-outcome="plea">
							<div class="case-file-outcome-stamp plea">Guilty Plea, 18 Months</div>
							<p class="case-file-narrative">Raymond accepted the plea. Psychiatric services consisted of monthly 15-minute check-ins. His medication was changed three times due to formulary restrictions, twice resulting in partial destabilization. He was released with a 30-day supply of medication and a referral to a clinic 14 miles away with no bus access. Within six weeks he was unmedicated again and arrested for a misdemeanor four months later.</p>
							<div class="case-file-callout red">↳ Prison is not treatment. For many people with serious mental illness, incarceration delays and worsens the underlying crisis.</div>
							<div class="case-file-factors-panel">
								<div class="case-file-factors-title">Systemic factors at work</div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">83%</div><div class="case-file-factor-text">Of incarcerated people with mental illness receive no treatment while incarcerated, per DOJ data.</div></div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">3×</div><div class="case-file-factor-text">People with untreated serious mental illness are three times more likely to be arrested than treated, in communities that have cut mental health services.</div></div>
							</div>
							<button class="case-file-restart-btn" data-case="2">↺ Restart this case</button>
						</div>
						<div class="case-file-outcome-block" data-outcome="trial">
							<div class="case-file-outcome-stamp guilty">Convicted, 3 Years</div>
							<p class="case-file-narrative">The jury found him guilty of misdemeanor assault rather than the felony. But the judge, citing his prior record, sentenced him to three years. The prior record consisted entirely of other mental-health-related incidents in which Raymond received no treatment. The cycle had been documented in his file for 22 years. The system documented the failure, then punished it.</p>
							<div class="case-file-callout red">↳ A record of untreated mental illness can be used to justify longer sentences for the very behavior that illness causes.</div>
							<div class="case-file-factors-panel">
								<div class="case-file-factors-title">Systemic factors at work</div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">64%</div><div class="case-file-factor-text">Of people in local jails report mental health problems, compared to 11% of the general population.</div></div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">$0</div><div class="case-file-factor-text">Amount of increased public safety benefit associated with incarcerating people with mental illness versus community-based treatment, per RAND Corporation research.</div></div>
							</div>
							<button class="case-file-restart-btn" data-case="2">↺ Restart this case</button>
						</div>
					</div>
				</div>

				<!-- ELENA -->
				<div class="case-file-case" data-case-id="3">
					<div class="case-file-tab-panel background-panel active">
						<div class="case-file-section-label">Background — Case 004</div>
						<div class="case-file-grid">
							<div class="case-file-field"><div class="case-file-field-label">Name</div><div class="case-file-field-value">Elena V.</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Age at arrest</div><div class="case-file-field-value">41</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Hometown</div><div class="case-file-field-value">Fresno, CA</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Immigration status</div><div class="case-file-field-value flag">Undocumented. In the US for 19 years.</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Family</div><div class="case-file-field-value">Husband (US citizen). Three children, ages 8–16. All US-born.</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Prior record</div><div class="case-file-field-value highlight">None</div></div>
						</div>
						<p class="case-file-narrative">Elena came to the United States from Oaxaca at 22 to escape domestic violence. She has lived in Fresno for 19 years, works as a farmworker and house cleaner. Her husband is a US citizen and construction worker. They own their home. Her three US-born children attend local schools. Her eldest is applying to colleges.</p>
						<div class="case-file-callout gold">↳ Elena's children know she has been arrested. Her 16-year-old has begun missing school.</div>
					</div>
					<div class="case-file-tab-panel charges-panel">
						<div class="case-file-section-label">Charges — Case 004</div>
						<div class="case-file-grid thirds">
							<div class="case-file-field"><div class="case-file-field-label">Primary charge</div><div class="case-file-field-value flag">Felony identity fraud / document fraud</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Details</div><div class="case-file-field-value">Used a false SSN to obtain employment</div></div>
							<div class="case-file-field"><div class="case-file-field-label">Immigration hold</div><div class="case-file-field-value flag">ICE detainer filed</div></div>
						</div>
						<p class="case-file-narrative">Elena was flagged during an E-Verify audit. She had used a Social Security number that did not belong to her to pass employment eligibility verification, a common practice among undocumented workers. The SSN was not connected to fraud on any individual person. An ICE detainer has been filed. If convicted of a felony, she is subject to mandatory deportation, separated from her husband and three American children.</p>
						<div class="case-file-callout red">↳ The felony charge, not the civil immigration violation, triggers mandatory deportation. The prosecutor has this leverage.</div>
					</div>
					<div class="case-file-tab-panel trial-panel">
						<div class="case-file-section-label">Trial — Decision Point</div>
						<p class="case-file-narrative">Elena's attorneys have identified a potential path, if the felony is reduced to a misdemeanor, deportation may not be mandatory, though ICE retains discretion.</p>
						<div class="case-file-callout">↳ Offer on the table, plead guilty to misdemeanor document fraud. No prison time, 2 years probation. Deportation not automatic, but ICE can still act independently.</div>
						<p class="case-file-narrative">If she fights the felony and loses, deportation is mandatory. If she wins, she is undocumented with no path to status and still subject to ICE action.</p>
						<div class="case-file-decision-panel" data-case="3">
							<div class="case-file-decision-question">Every option carries risk of family separation. What do you counsel Elena to do?</div>
							<div class="case-file-decision-options">
								<button class="case-file-decision-btn" data-choice="plea"><span class="case-file-opt-label">Option A</span><span class="case-file-opt-text">Accept the misdemeanor plea, avoid mandatory deportation, hope ICE exercises discretion</span></button>
								<button class="case-file-decision-btn" data-choice="trial"><span class="case-file-opt-label">Option B</span><span class="case-file-opt-text">Fight the felony, argue the charge is disproportionate to the harm caused</span></button>
							</div>
						</div>
					</div>
					<div class="case-file-tab-panel outcome-panel">
						<div class="case-file-section-label">Outcome — Case 004</div>
						<div class="case-file-outcome-block" data-outcome="plea">
							<div class="case-file-outcome-stamp plea">Misdemeanor Plea</div>
							<p class="case-file-narrative">Elena accepted the misdemeanor plea. ICE reviewed her case and, given her 19-year residency, US-citizen family, and clean record, chose not to deport her, for now. Her status remains unresolved. She lives with the knowledge that this could change with any administration, any policy shift. Her eldest was accepted to a state university.</p>
							<div class="case-file-callout gold">↳ This is the best realistic outcome. It is also entirely contingent on ICE discretion, not law, not rights, but an agency's choice.</div>
							<div class="case-file-factors-panel">
								<div class="case-file-factors-title">Systemic factors at work</div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">10.5M</div><div class="case-file-factor-text">Undocumented people live in the US, the vast majority with no criminal record, contributing to communities and raising American-born children.</div></div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">~88K</div><div class="case-file-factor-text">People are deported annually who have US-citizen children, resulting in family separation without criminal conviction.</div></div>
							</div>
							<button class="case-file-restart-btn" data-case="3">↺ Restart this case</button>
						</div>
						<div class="case-file-outcome-block" data-outcome="trial">
							<div class="case-file-outcome-stamp guilty">Convicted, Deported</div>
							<p class="case-file-narrative">Elena went to trial. The jury convicted on the felony in two days. She was sentenced to time served and mandatory deportation. She was deported to Oaxaca six weeks later. Her husband and children remained in Fresno. Her youngest cried every night for two months. Her eldest deferred college enrollment. The family is pursuing a spousal visa petition, average processing time, 2–3 years.</p>
							<div class="case-file-callout red">↳ She committed no violence, harmed no individual, and had lived as a contributing community member for nearly two decades. The law did not account for any of this.</div>
							<div class="case-file-factors-panel">
								<div class="case-file-factors-title">Systemic factors at work</div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">0</div><div class="case-file-factor-text">Legal immigration pathways available to most undocumented long-term residents, even those with US-citizen spouses and children, without leaving and re-entering.</div></div>
								<div class="case-file-factor-item"><div class="case-file-factor-stat">4M+</div><div class="case-file-factor-text">US-citizen children have an undocumented parent. Immigration enforcement decisions routinely separate these families.</div></div>
							</div>
							<button class="case-file-restart-btn" data-case="3">↺ Restart this case</button>
						</div>
					</div>
				</div>
			</div>

			<div class="case-file-footer">
				<div class="case-file-footer-note">Read each tab in order to unlock the outcome.</div>
				<div class="case-file-nav-btns">
					<button class="case-file-nav-btn" id="case-prev-btn" disabled>← Back</button>
					<button class="case-file-nav-btn primary" id="case-next-btn">Next →</button>
				</div>
			</div>
		</div>
	`;
	
	document.body.appendChild(modal);

	//  model for active case/tab and decision outcomes
	let currentCase = 0;
	let currentSection = 0;
	let unlockedSections = { 0: 1, 1: 1, 2: 1, 3: 1 };
	let decisions = {};

	function navCase(direction) {
		currentCase = Math.max(0, Math.min(3, currentCase + direction));
		currentSection = 0;
		decisions[currentCase] = undefined;
		renderCaseView();
	}

	function navSection(direction) {
		const maxUnlocked = unlockedSections[currentCase] || 1;
		if (direction === 1 && currentSection === 2 && !decisions[currentCase]) {
			const decisionPanel = modal.querySelector(`[data-case="${currentCase}"]`);
			if (decisionPanel) {
				decisionPanel.style.outline = '2px solid rgba(55,156,228,0.5)';
				setTimeout(() => decisionPanel.style.outline = '', 700);
			}
			return;
		}
		if (direction === 1 && currentSection === 2 && decisions[currentCase]) {
			unlockedSections[currentCase] = 4;
		}
		
		//  case is done, so close the experience instead of looping back to the beginning
		if (direction === 1 && currentSection === 3 && currentCase === 3) {
			modal.remove();
			return;
		}
		
		//  earlier case completion jumps automatically to the next case
		if (direction === 1 && currentSection === 3 && currentCase < 3) {
			currentCase++;
			currentSection = 0;
			decisions[currentCase] = undefined;
			renderCaseView();
			return;
		}
		
		currentSection = Math.max(0, Math.min(3, currentSection + direction));
		renderCaseView();
	}

	function renderCaseView() {
		const maxUnlocked = unlockedSections[currentCase] || 1;
		const cases = modal.querySelectorAll('.case-file-case');
		cases.forEach((c, i) => {
			c.style.display = i === currentCase ? 'block' : 'none';
		});

		const panels = modal.querySelectorAll('.case-file-tab-panel');
		panels.forEach(p => p.classList.remove('active'));
		const activePanel = modal.querySelector(`.case-file-case[data-case-id="${currentCase}"] .case-file-tab-panel.background-panel`);
		if (currentSection === 0) activePanel.classList.add('active');
		else {
			const sectionPanels = modal.querySelectorAll(`.case-file-case[data-case-id="${currentCase}"] .case-file-tab-panel`);
			if (sectionPanels[currentSection]) sectionPanels[currentSection].classList.add('active');
		}

		// If  case has no chosen decision, keep its option buttons clickable
		if (!decisions[currentCase]) {
			const decPanel = modal.querySelector(`[data-case="${currentCase}"]`);
			if (decPanel) {
				decPanel.querySelectorAll('.case-file-decision-btn').forEach(b => {
					b.classList.remove('selected');
					b.disabled = false;
				});
			}
		}

		const sectionTabs = modal.querySelectorAll('.case-file-section-tab');
		sectionTabs.forEach((t, i) => {
			t.classList.remove('active', 'locked');
			if (i === currentSection) {
				t.classList.add('active');
			} else if (i > maxUnlocked) {
				t.classList.add('locked');
			}
		});

		const caseTabs = modal.querySelectorAll('.case-file-tab');
		caseTabs.forEach((t, i) => {
			t.classList.toggle('active', i === currentCase);
		});

		const prevBtn = modal.querySelector('#case-prev-btn');
		const nextBtn = modal.querySelector('#case-next-btn');
		prevBtn.disabled = currentSection === 0;

		if (currentSection === 3) {
			if (currentCase < 3) {
				nextBtn.disabled = false;
				nextBtn.textContent = 'Next Case →';
				nextBtn.className = 'case-file-nav-btn primary';
				modal.querySelector('.case-file-footer-note').textContent = 'Next case';
			} else {
				nextBtn.disabled = false;
				nextBtn.textContent = 'Finish';
				nextBtn.className = 'case-file-nav-btn black-finish-btn';
				modal.querySelector('.case-file-footer-note').textContent = 'All cases explored.';
			}
		} else if (currentSection === 2) {
			nextBtn.disabled = false;
			nextBtn.textContent = 'Reveal Outcome →';
			nextBtn.className = 'case-file-nav-btn gold-btn';
			modal.querySelector('.case-file-footer-note').textContent = 'Make a decision to unlock the outcome.';
		} else {
			nextBtn.disabled = false;
			nextBtn.textContent = 'Next →';
			nextBtn.className = 'case-file-nav-btn primary';
			modal.querySelector('.case-file-footer-note').textContent = `Tab ${currentSection + 1} of 4`;
		}
	}

	// click handlers for tabs, choices, nav controls, restart, and modal close
	const closeBtn = modal.querySelector('.case-file-close');
	closeBtn.addEventListener('click', () => modal.remove());

	const caseTabs = modal.querySelectorAll('.case-file-tab');
	caseTabs.forEach(tab => {
		tab.addEventListener('click', function() {
			currentCase = parseInt(this.getAttribute('data-case'));
			currentSection = 0;
			decisions[currentCase] = undefined;
			renderCaseView();
		});
	});

	const decisionBtns = modal.querySelectorAll('.case-file-decision-btn');
	decisionBtns.forEach(btn => {
		btn.addEventListener('click', function() {
			const choice = this.getAttribute('data-choice');
			const caseId = this.closest('.case-file-decision-panel').getAttribute('data-case');
			decisions[caseId] = choice;
			
			const panel = this.closest('.case-file-decision-panel');
			panel.querySelectorAll('.case-file-decision-btn').forEach(b => {
				b.classList.remove('selected');
				b.disabled = true;
			});
			this.classList.add('selected');

			const outcomePanel = modal.querySelector(`.case-file-case[data-case-id="${caseId}"] .outcome-panel`);
			outcomePanel.querySelectorAll('.case-file-outcome-block').forEach(b => b.style.display = 'none');
			const targetOutcome = outcomePanel.querySelector(`[data-outcome="${choice}"]`);
			if (targetOutcome) targetOutcome.style.display = 'block';
		});
	});

	const restartBtns = modal.querySelectorAll('.case-file-restart-btn');
	restartBtns.forEach(btn => {
		btn.addEventListener('click', function() {
			const caseId = parseInt(this.getAttribute('data-case'));
			unlockedSections[caseId] = 1;
			decisions[caseId] = undefined;
			
			// Reset decision buttons so the case can be replayed cleanly
			const allDecPanels = modal.querySelectorAll(`[data-case="${caseId}"]`);
			allDecPanels.forEach(panel => {
				panel.querySelectorAll('.case-file-decision-btn').forEach(b => {
					b.classList.remove('selected');
					b.disabled = false;
				});
			});
			
			// hide all possible outcomes until a new choice is made
			const outPanel = modal.querySelector(`.case-file-case[data-case-id="${caseId}"] .outcome-panel`);
			if (outPanel) {
				outPanel.querySelectorAll('.case-file-outcome-block').forEach(b => b.style.display = 'none');
			}
			
			currentCase = caseId;
			currentSection = 0;
			renderCaseView();
		});
	});

	const prevBtn = modal.querySelector('#case-prev-btn');
	const nextBtn = modal.querySelector('#case-next-btn');
	prevBtn.addEventListener('click', () => navSection(-1));
	nextBtn.addEventListener('click', () => navSection(1));

	// clicking the backdrop closes the modal
	modal.addEventListener('click', (e) => {
		if (e.target === modal) modal.remove();
	});

	renderCaseView();
}

// "The Audit" :
// fast decision loop where the player reviews model outputs under time pressure,
// then compares their calls, documented real-world cases.

function openTechGame() {
	const existingModal = document.getElementById('tech-game-modal-custom');
	if (existingModal) existingModal.remove();

	const modal = document.createElement('div');
	modal.id = 'tech-game-modal-custom';
	modal.className = 'day-in-life-modal';

	modal.innerHTML = `
		<div class="tech-game-modal-content">

			<!-- HEADER -->
			<div class="tech-game-header">
				<div>
					<h3 class="tech-game-title">The Audit</h3>
					<p class="tech-game-subtitle">Six algorithmic decisions. Six people. You have thirty seconds per case.</p>
				</div>
				<button class="tech-game-close">✕</button>
			</div>

			<!-- INTRO SCREEN -->
			<div class="tech-game-screen active" id="tech-intro-screen">
				<div class="tech-game-intro-body">
					<p>
						You have been assigned to audit a queue of automated decisions made by 
						institutional systems, a risk algorithm, a benefits screening tool, 
						a content moderation model, a credit scoring engine. 
					</p>
					<p>
						Each case shows you what the system knows about a person and what it decided. 
						You can let the decision stand, or override it. 
						There is a timer. There is always a timer.
					</p>
					<p>
						The systems you are auditing are based on real systems currently in use. 
						The cases are based on documented outcomes.
					</p>
					<div class="tech-game-intro-warning">You will not have enough information. Neither does the system.
					</div>
				</div>
				<div class="tech-game-system-select">
					<div class="tech-game-system-label">Select your audit queue:</div>
					<div class="tech-game-system-grid">
						<button class="tech-game-system-card" data-system="criminal">
							<div class="tech-game-sys-icon"></div>
							<div class="tech-game-sys-name">COMPAS Risk Engine</div>
							<div class="tech-game-sys-desc">Criminal sentencing & bail decisions · US Federal Courts</div>
						</button>
						<button class="tech-game-system-card" data-system="benefits">
							<div class="tech-game-sys-icon"></div>
							<div class="tech-game-sys-name">Automated Eligibility System</div>
							<div class="tech-game-sys-desc">Public benefits screening · Indiana, Arkansas, Idaho</div>
						</button>
						<button class="tech-game-system-card" data-system="content">
							<div class="tech-game-sys-icon"></div>
							<div class="tech-game-sys-name">Content Moderation Model</div>
							<div class="tech-game-sys-desc">Automated removal decisions · Major social platform</div>
						</button>
					</div>
				</div>
			</div>

			<!-- AUDIT SCREEN -->
			<div class="tech-game-screen" id="tech-audit-screen">

				<div class="tech-game-top-bar">
					<div class="tech-game-system-badge" id="tech-system-badge">SYSTEM</div>
					<div class="tech-game-case-counter" id="tech-case-counter">Case 1 of 6</div>
					<div class="tech-game-timer-wrap">
						<div class="tech-game-timer-label">TIME REMAINING</div>
						<div class="tech-game-timer" id="tech-timer">0:30</div>
						<div class="tech-game-timer-bar-wrap">
							<div class="tech-game-timer-bar" id="tech-timer-bar"></div>
						</div>
					</div>
				</div>

				<div class="tech-game-case-layout">

					<!-- Left: data profile -->
					<div class="tech-game-profile-panel">
						<div class="tech-game-panel-label">DATA PROFILE</div>
						<div class="tech-game-profile-name" id="tech-profile-name">—</div>
						<div class="tech-game-profile-fields" id="tech-profile-fields"></div>
						<div class="tech-game-data-note" id="tech-data-note"></div>
					</div>

					<!-- Right: system ruling + controls -->
					<div class="tech-game-ruling-panel">
						<div class="tech-game-panel-label">SYSTEM RULING</div>
						<div class="tech-game-ruling-box" id="tech-ruling-box">
							<div class="tech-game-ruling-verdict" id="tech-ruling-verdict">—</div>
							<div class="tech-game-ruling-score" id="tech-ruling-score"></div>
							<div class="tech-game-ruling-reason" id="tech-ruling-reason">—</div>
						</div>
						<div class="tech-game-confidence" id="tech-confidence-bar-wrap">
							<div class="tech-game-confidence-label">MODEL CONFIDENCE</div>
							<div class="tech-game-confidence-track">
								<div class="tech-game-confidence-fill" id="tech-confidence-fill"></div>
							</div>
							<div class="tech-game-confidence-val" id="tech-confidence-val"></div>
						</div>
						<div class="tech-game-action-area" id="tech-action-area">
							<div class="tech-game-action-prompt">Your decision:</div>
							<div class="tech-game-action-btns">
								<button class="tech-game-action-btn uphold" id="tech-uphold-btn">Uphold Decision</button>
								<button class="tech-game-action-btn override" id="tech-override-btn">Override</button>
							</div>
						</div>
						<div class="tech-game-outcome-box" id="tech-outcome-box"></div>
					</div>
				</div>

				<div class="tech-game-nav">
					<button class="tech-game-nav-btn" id="tech-prev-btn" disabled>← Prev</button>
					<button class="tech-game-nav-btn primary" id="tech-next-btn" style="display:none;">Next Case →</button>
					<button class="tech-game-nav-btn finish" id="tech-finish-btn" style="display:none;">View Audit Report →</button>
				</div>
			</div>

			<!-- REPORT SCREEN -->
			<div class="tech-game-screen" id="tech-report-screen">
				<div class="tech-game-report-title">Audit Report</div>
				<div class="tech-game-report-system" id="tech-report-system">—</div>
				<div class="tech-game-report-table" id="tech-report-table"></div>
				<div class="tech-game-report-stats" id="tech-report-stats"></div>
				<div class="tech-game-report-reflection" id="tech-report-reflection"></div>
				<div class="tech-game-report-quote">
				</div>
				<button class="tech-game-nav-btn" id="tech-restart-btn">↺ New Audit Queue</button>
			</div>

		</div>
	`;

	document.body.appendChild(modal);
	modal.style.display = 'flex';

	// content

	const systems = {

		criminal: {
			badge: 'COMPAS RISK ENGINE',
			cases: [
				{
					name: 'Brisha Borden, 18',
					fields: [
						{ label: 'Charge', value: 'Running off with an unlocked child\'s scooter' },
						{ label: 'Prior offenses', value: '0 violent · 0 felonies' },
						{ label: 'Age at first arrest', value: '16 (misdemeanor)' },
						{ label: 'COMPAS survey response', value: '"My friends sometimes get in trouble"' },
						{ label: 'Family members with criminal record', value: 'Yes (flagged)' },
						{ label: 'Neighborhood poverty index', value: 'High' },
					],
					dataNote: 'Race is not a direct input. Neighborhood, family history, and survey responses are.',
					verdict: 'HIGH RISK',
					score: '8 / 10',
					reason: 'Environmental and associative risk factors elevated. Peer criminality index: high.',
					confidence: 87,
					upholdOutcome: { label: 'UPHELD', text: 'Borden receives a higher bail amount and is held until trial. She is convicted of a misdemeanor. Her COMPAS score follows her record for future assessments. She was Black. The child whose scooter she took was not charged.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'Override is logged. A human reviewer assigns standard conditions for a first-time misdemeanor. This is close to what should have happened, and what would have happened for the white defendant with a more serious charge whose COMPAS score was 3.' },
					realNote: 'ProPublica, 2016: Borden\'s case was documented alongside that of Vernon Prater, a white man with two prior felonies, who received a COMPAS score of 3. Borden did not reoffend. Prater did.'
				},
				{
					name: 'Vernon Prater, 41',
					fields: [
						{ label: 'Charge', value: 'Shoplifting $86.35 from a hardware store' },
						{ label: 'Prior offenses', value: '2 felonies · 1 misdemeanor' },
						{ label: 'Prior felony type', value: 'Armed robbery, attempted armed robbery' },
						{ label: 'Years since last conviction', value: '5' },
						{ label: 'Employment status', value: 'Employed (part-time)' },
						{ label: 'Neighborhood poverty index', value: 'Low' },
					],
					dataNote: 'Employment and stable residence weighted positively. Prior convictions weighted against.',
					verdict: 'LOW RISK',
					score: '3 / 10',
					reason: 'Stable environmental indicators. Time elapsed since last offense. Employment flagged positive.',
					confidence: 74,
					upholdOutcome: { label: 'UPHELD', text: 'Prater receives standard conditions for the shoplifting charge. Within two years, he is arrested for breaking into a warehouse and stealing thousands of dollars of electronics. COMPAS rated him low risk. He was not.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You flag the prior violent felony record. The override is reviewed. The reviewer agrees the score seems low and applies additional conditions. The additional oversight has no clear effect on outcome.' },
					realNote: 'Same ProPublica analysis: Prater reoffended within two years. The system\'s low-risk assessment was wrong. The high-risk assessment of Borden, who did not reoffend, was also wrong. Both errors ran in the same direction.'
				},
				{
					name: 'Robert Driemeyer, 22',
					fields: [
						{ label: 'Charge', value: 'Drug possession (personal use quantity)' },
						{ label: 'Prior offenses', value: '0' },
						{ label: 'Education level', value: 'Some college' },
						{ label: 'COMPAS survey: "Bored often"', value: 'Strongly agree (flagged)' },
						{ label: 'COMPAS survey: "People trying to make life difficult"', value: 'Agree (flagged)' },
						{ label: 'Housing stability', value: 'Stable (renting)' },
					],
					dataNote: 'Psychometric survey responses directly influence score. Questions are not disclosed to defendants.',
					verdict: 'MEDIUM RISK',
					score: '5 / 10',
					reason: 'Attitudinal risk indicators present. Social instability markers in survey responses.',
					confidence: 61,
					upholdOutcome: { label: 'UPHELD', text: 'A medium-risk score on a first-offense possession charge affects plea negotiation. The prosecutor uses it to justify a harsher offer. Driemeyer takes the plea. The algorithm\'s survey-based assessment of his "attitude" shaped the outcome of a criminal proceeding he did not know was influenced by his answers to questions he thought were voluntary.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You note that a medium score on a first possession offense is disproportionate, and that survey-based psychometric inputs are not disclosed to defendants. The override is logged. Whether it affects the proceeding depends on whether the prosecutor sees it.' },
					realNote: 'The COMPAS survey questions, and the fact that they influence criminal sentencing, are not disclosed to defendants at the point of answering them. Defendants have challenged COMPAS scores in court; most challenges have failed on proprietary grounds.'
				},
				{
					name: 'Tamika Reynolds, 34',
					fields: [
						{ label: 'Charge', value: 'Fraud (benefits overpayment, $1,200)' },
						{ label: 'Prior offenses', value: '1 misdemeanor (age 19)' },
						{ label: 'Current employment', value: 'None (primary caregiver)' },
						{ label: 'Dependents', value: '3 children' },
						{ label: 'Public housing resident', value: 'Yes (flagged)' },
						{ label: 'Zip code crime index', value: 'Elevated' },
					],
					dataNote: 'Public housing residency and zip code crime index are proxy variables for race and class.',
					verdict: 'HIGH RISK',
					score: '7 / 10',
					reason: 'Environmental instability. Prior record. Geographic risk factors elevated.',
					confidence: 79,
					upholdOutcome: { label: 'UPHELD', text: 'Reynolds is assessed as high risk for a benefits overpayment charge. The score influences pre-trial detention and plea conditions. Three children\'s primary caregiver is held on a charge that, for a white defendant in a lower-risk zip code with identical facts, would likely produce a score of 3 or 4.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You flag the variables, public housing and zip code as environmental inputs that correlate with race. The override note goes into the file. It is read by a clerk. It does not change the system\'s training data.' },
					realNote: 'Documented proxy discrimination: variables that do not mention race but correlate with it so strongly that their inclusion produces racially disparate outcomes. This is the mechanism Ruha Benjamin calls the New Jim Code.'
				},
				{
					name: 'Dawit Haile, 27',
					fields: [
						{ label: 'Charge', value: 'Disorderly conduct (bar altercation, no injury)' },
						{ label: 'Prior offenses', value: '0' },
						{ label: 'Immigration status', value: 'Permanent resident (flagged by system)' },
						{ label: 'Country of origin', value: 'Ethiopia (flagged by system)' },
						{ label: 'Length of US residence', value: '9 years' },
						{ label: 'Employment', value: 'Full-time, medical technician' },
					],
					dataNote: 'Immigration status is flagged as a flight risk indicator. Country of origin is a data field.',
					verdict: 'MEDIUM-HIGH RISK',
					score: '6 / 10',
					reason: 'Flight risk: non-citizen status. Environmental: country-of-origin flag.',
					confidence: 68,
					upholdOutcome: { label: 'UPHELD', text: 'Haile\'s immigration status elevates his score on a first-offense misdemeanor. Higher bail is set. He pays it, appears for all proceedings, and is acquitted. The flight risk assessment was wrong. Nine years of residence, full-time employment, and zero prior offenses were outweighed by a checkbox.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You note that permanent residency combined with nine years of stable residence and employment makes a flight risk assessment of 6 difficult to justify on the facts. The override is entered. Bail is set at standard first-offense rate.' },
					realNote: 'Immigration status as a COMPAS input has been challenged in courts in multiple states. Federal courts have split on whether its inclusion constitutes discriminatory impact.'
				},
				{
					name: 'Marcus Webb, 17',
					fields: [
						{ label: 'Charge', value: 'Vandalism (graffiti, $400 damage)' },
						{ label: 'Prior offenses', value: '1 (trespassing, age 15, no conviction)' },
						{ label: 'School attendance', value: 'Irregular (flagged)' },
						{ label: 'COMPAS survey: "Adults treat teens unfairly"', value: 'Strongly agree (flagged)' },
						{ label: 'Single-parent household', value: 'Yes (flagged)' },
						{ label: 'Family public assistance history', value: 'Yes (flagged)' },
					],
					dataNote: 'Juvenile COMPAS version. Survey responses and family structure are heavily weighted.',
					verdict: 'HIGH RISK',
					score: '8 / 10',
					reason: 'Attitudinal instability. Family instability. School attendance concern. Peer environment.',
					confidence: 83,
					upholdOutcome: { label: 'UPHELD', text: 'A 17-year-old receives a high-risk score for spray paint. The score, based partly on his answer that he thinks adults treat teenagers unfairly, shapes his juvenile disposition. He is not diverted to community programs. The score will follow him into the adult system if he is charged again.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You flag that a survey question asking whether a teenager believes adults treat them unfairly is being used to produce a criminal risk score, and that agreeing with it is treated as a warning sign rather than an accurate perception. The override is entered.' },
					realNote: 'The juvenile COMPAS survey question "Adults in my life treated teens fair" has been criticized by researchers as penalizing responses that, for teenagers of color, may simply be accurate descriptions of their experience of the justice system.'
				}
			],
			reflection: 'COMPAS was used in at least 60 US jurisdictions to inform sentencing. Its accuracy in predicting recidivism is approximately equal to untrained human judgment, but it carries the authority of a score and the protection of a trade secret. The people it assessed had no right to see the algorithm that assessed them.'
		},

		benefits: {
			badge: 'AUTOMATED ELIGIBILITY SYSTEM',
			cases: [
				{
					name: 'Denise Rust, 46',
					fields: [
						{ label: 'Program', value: 'Indiana FSSA automated Medicaid system' },
						{ label: 'Current status', value: 'Medicaid enrolled, 12 years' },
						{ label: 'Documented condition', value: 'Bipolar disorder, insulin-dependent diabetes' },
						{ label: 'System flag', value: 'Unable to complete phone interview within 2-attempt window' },
						{ label: 'Reason for non-completion', value: 'Hospitalized during contact window' },
						{ label: 'Documentation submitted', value: 'Yes — hospital records' },
					],
					dataNote: 'Indiana\'s IBM-administered system terminated coverage automatically if interviews were not completed. Hospitalization was not a recognized exception.',
					verdict: 'INELIGIBLE — COVERAGE TERMINATED',
					score: '',
					reason: 'Failed to complete required eligibility interview within compliance window. Auto-termination triggered.',
					confidence: 100,
					upholdOutcome: { label: 'UPHELD', text: 'Coverage is terminated. Rust, hospitalized and diabetic, loses Medicaid. She is discharged into a gap. Her insulin and psychiatric medication are no longer covered. She cannot afford them without coverage. The system did not ask why she missed the interview. It processed a result.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You flag the hospitalization documentation and manually restore coverage pending human review. This is what should have happened. In Indiana\'s automated system between 2006 and 2009, an estimated 22,000 people lost coverage they were entitled to because the system had no exception logic for circumstances like hospitalization.' },
					realNote: 'Virginia Eubanks, Automating Inequality (2018): Indiana\'s IBM contract was terminated in 2009 after a lawsuit. 22,000 wrongful terminations were documented. IBM was paid $1.37 billion before the contract ended.'
				},
				{
					name: 'Ledge LaMarche, 59',
					fields: [
						{ label: 'Program', value: 'Arkansas Medicaid personal care hours' },
						{ label: 'Condition', value: 'Cerebral palsy, seizure disorder' },
						{ label: 'Prior care hours', value: '56 hours/week (human assessment)' },
						{ label: 'New algorithmic assessment', value: '13 hours/week (system output)' },
						{ label: 'Explanation provided', value: 'None' },
						{ label: 'Appeal filed', value: 'Yes — denied' },
					],
					dataNote: 'Arkansas deployed an algorithm to calculate personal care hours in 2016. The algorithm\'s logic was not disclosed. Cuts of 30–50% were common.',
					verdict: 'HOURS REDUCED — 56 → 13/WEEK',
					score: '',
					reason: 'Algorithmic reassessment complete. New allocation: 13 hours weekly personal care.',
					confidence: 100,
					upholdOutcome: { label: 'UPHELD', text: 'LaMarche\'s care hours drop from 56 to 13 per week. His caregivers, paid through Medicaid, can no longer cover morning preparation, meals, and nighttime needs. He cannot bathe, dress, or eat independently. The algorithm did not know any of this because it was not asked to know it.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You flag the reduction as requiring human review given the degree of change and the absence of documented functional improvement. This is the appeal LaMarche filed. It was denied. A federal court eventually ruled that Arkansas\'s algorithm violated due process because it did not provide a comprehensible reason for its decisions.' },
					realNote: 'Ledge LaMarche v. Gillespie (2019): Federal court ruled that Arkansas\'s algorithm violated due process. The state was required to provide comprehensible explanations for care hour reductions. The algorithm had been providing none.'
				},
				{
					name: 'Gail Humphreys, 38',
					fields: [
						{ label: 'Program', value: 'Idaho Medicaid home care assessment' },
						{ label: 'Condition', value: 'Traumatic brain injury (TBI), partial paralysis' },
						{ label: 'Prior care hours', value: '84 hours/week (nurse assessment)' },
						{ label: 'Algorithmic reassessment', value: '36 hours/week' },
						{ label: 'Change in condition since prior assessment', value: 'None documented' },
						{ label: 'Explanation for reduction', value: 'Not provided' },
					],
					dataNote: 'Idaho adopted Arkansas\'s algorithm. The same formula produced the same category of outcome across both states.',
					verdict: 'HOURS REDUCED — 84 → 36/WEEK',
					score: '',
					reason: 'Standard algorithmic care assessment complete. New allocation applied.',
					confidence: 100,
					upholdOutcome: { label: 'UPHELD', text: 'Humphreys\'s care drops by 57%. She has a TBI and partial paralysis. Her condition has not changed. The algorithm processed different variables than the nurse who previously assessed her. The nurse\'s assessment included things the algorithm could not represent as fields.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You flag a 57% reduction with no change in condition as requiring mandatory human review. This is what advocates argued Idaho\'s system lacked: a mandatory trigger for human oversight when algorithmic output diverged significantly from prior human assessment.' },
					realNote: 'Idaho adopted the same SIS algorithm as Arkansas. Both states faced federal legal challenges. Both were found to have violated due process. The algorithm was used in multiple states before these rulings.'
				},
				{
					name: 'Family of four, names withheld',
					fields: [
						{ label: 'Program', value: 'Supplemental Nutrition Assistance Program (SNAP)' },
						{ label: 'System', value: 'Automated fraud detection model' },
						{ label: 'Flag triggered', value: 'Address history — frequent moves' },
						{ label: 'Reason for moves', value: 'Eviction history (economic instability)' },
						{ label: 'Fraud indicator generated', value: 'Address irregularity pattern' },
						{ label: 'Benefits status', value: 'Suspended pending fraud review' },
					],
					dataNote: 'Frequent address changes are a fraud indicator in multiple automated benefits systems. They are also a marker of poverty and housing instability.',
					verdict: 'FRAUD INVESTIGATION TRIGGERED — BENEFITS SUSPENDED',
					score: '',
					reason: 'Anomalous address pattern detected. Automated suspension pending investigative review.',
					confidence: 92,
					upholdOutcome: { label: 'UPHELD', text: 'Benefits are suspended for a family of four while a fraud investigation that takes six weeks is conducted. The family did not commit fraud. They moved frequently because they were being evicted. The system treated the consequence of poverty as evidence of dishonesty. The investigation finds no fraud. Benefits are restored. Six weeks of food insecurity are not restored.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You flag address instability as a documented proxy for housing poverty and request human review before suspension, rather than after. This procedural difference, suspension before or after human review, is the difference between six weeks of food insecurity and an administrative note.' },
					realNote: 'ProPublica and The Atlantic have documented multiple cases in which automated fraud detection in SNAP treated housing instability as suspicious behavior. The systems were not designed to distinguish between fraud patterns and poverty patterns.'
				},
				{
					name: 'Carl Redding, 63',
					fields: [
						{ label: 'Program', value: 'Social Security Disability Insurance (SSDI)' },
						{ label: 'Condition', value: 'Chronic obstructive pulmonary disease (COPD), stage 3' },
						{ label: 'Prior work history', value: '38 years, construction (physical labor)' },
						{ label: 'Initial claim', value: 'Denied — automated initial review' },
						{ label: 'Reason for denial', value: 'Vocational profile: transferable skills detected' },
						{ label: '"Transferable skills" identified', value: 'General labor coordination, basic equipment operation' },
					],
					dataNote: 'SSA automated systems apply vocational grids that do not account for the physical demands of "transferable" roles for people with pulmonary conditions.',
					verdict: 'CLAIM DENIED — TRANSFERABLE SKILLS EXIST',
					score: '',
					reason: 'Applicant work history indicates transferable vocational capacity. Disability threshold not met per occupational grid.',
					confidence: 71,
					upholdOutcome: { label: 'UPHELD', text: 'Redding\'s SSDI claim is denied. He has stage 3 COPD and cannot perform sustained physical activity. The "transferable skills" identified, labor coordination, equipment operation, all require physical presence in environments his pulmonary condition makes dangerous. The system identified skills without identifying whether he could exercise them.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You flag that the transferable occupations listed require physical capacities the applicant\'s documented condition precludes. The override routes the case to human review. Approximately 60% of initial SSDI denials that are appealed are eventually approved, meaning the initial automated decision is wrong in the majority of contested cases.' },
					realNote: 'SSA statistics: approximately 60% of SSDI cases that go to hearing are ultimately approved. The initial denial rate for automated and automated-assisted decisions is above 60%. The system\'s error in the direction of denial is structurally built in.'
				},
				{
					name: 'Lena Vasquez, 29',
					fields: [
						{ label: 'Program', value: 'Allegheny County Family Screening Tool (child services)' },
						{ label: 'Flag source', value: 'Referral from hospital (delivery room)' },
						{ label: 'Predictive score generated', value: 'High risk of future maltreatment' },
						{ label: 'Inputs to score', value: 'Prior SNAP use, prior public housing, mental health service contact' },
						{ label: 'Current situation', value: 'First child, stable housing, employed' },
						{ label: 'Documented maltreatment history', value: 'None' },
					],
					dataNote: 'The Allegheny FST scores based on public service contact history. Poverty-related service use is statistically predictive, but predicts poverty, not maltreatment.',
					verdict: 'HIGH RISK — ENHANCED SURVEILLANCE RECOMMENDED',
					score: '',
					reason: 'Predictive risk model output: elevated. History of public service contact. Enhanced monitoring recommended.',
					confidence: 78,
					upholdOutcome: { label: 'UPHELD', text: 'Vasquez is flagged as high risk in the delivery room. A caseworker visits within 48 hours. There is nothing to find. But the visit is logged. The log becomes part of her family\'s record. Future algorithmic assessments will include this service contact. The score helped produce the contact that will justify a future score.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You note that the inputs driving the score, SNAP, public housing, mental health contact, are all indicators of poverty, not maltreatment. The override requests standard rather than enhanced monitoring. This is the critique researchers have leveled at the Allegheny FST: it predicts which families have used public services, not which children are at risk.' },
					realNote: 'Virginia Eubanks documented the Allegheny FST extensively in Automating Inequality. Researchers at the University of Michigan found that the tool\'s predictive power was largely attributable to its correlation with poverty. Poverty predicts service contact. Service contact predicts score. Score predicts surveillance.'
				}
			],
			reflection: 'In Indiana, Arkansas, and Idaho, automated benefits systems were deployed and then challenged in federal court, in each case after thousands of people had already lost coverage they were entitled to. The systems\' designers had built in no mechanism for the system to be wrong. There was no exception logic, no mandatory human review trigger, no comprehensible explanation. That was not an oversight. It reduced administrative cost.'
		},

		content: {
			badge: 'CONTENT MODERATION MODEL',
			cases: [
				{
					name: 'Post flagged for removal',
					fields: [
						{ label: 'Content type', value: 'Video — testimonial' },
						{ label: 'Account', value: 'Palestinian journalist, 340,000 followers' },
						{ label: 'Content', value: 'Video documenting destruction of residential building. No graphic imagery. Text: "This was my neighborhood."' },
						{ label: 'Model classification', value: 'Violent extremism — incitement' },
						{ label: 'Human review', value: 'Not triggered (high-confidence removal)' },
						{ label: 'Account status', value: 'Strikes applied' },
					],
					dataNote: 'Models trained on Western English-language datasets systematically misclassify Arabic-language conflict documentation.',
					verdict: 'REMOVED — VIOLENT EXTREMISM',
					score: '',
					reason: 'High-confidence classification: content promoting violent extremism. Automatic removal applied.',
					confidence: 94,
					upholdOutcome: { label: 'UPHELD', text: 'The video is removed. The journalist\'s account receives strikes. First-person documentation of the destruction of a civilian home is classified as violent extremism by a model that cannot read Arabic well, was not trained on Arabic-language conflict journalism, and had no human reviewer assigned because its confidence score was above the human-review threshold.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You flag the misclassification and restore the content. Human Rights Watch has documented systematic removal of Palestinian documentation from major platforms during conflict periods, removal that the platforms have attributed to automated error. The content was testimony, not incitement.' },
					realNote: 'Human Rights Watch (2023): documented systematic suppression of Palestinian content during the October 2023 conflict. Meta, Instagram, and TikTok acknowledged errors. Content was not restored for most accounts. Some was gone before appeals could be filed.'
				},
				{
					name: 'Post flagged for removal',
					fields: [
						{ label: 'Content type', value: 'Text post' },
						{ label: 'Account', value: 'Survivor advocacy organization, domestic violence' },
						{ label: 'Content', value: 'Post describing warning signs of coercive control. Contains the phrase "he hits her."' },
						{ label: 'Model classification', value: 'Promotion of violence' },
						{ label: 'Reach before removal', value: '12 people' },
						{ label: 'Account status', value: 'Post removed. No strikes.' },
					],
					dataNote: 'Violence-related keyword detection does not distinguish between descriptions of violence, reporting on violence, and promotion of violence.',
					verdict: 'REMOVED — PROMOTION OF VIOLENCE',
					score: '',
					reason: 'Violence promotion keyword detected. Content removed. No account action at this time.',
					confidence: 81,
					upholdOutcome: { label: 'UPHELD', text: 'The post is removed. The advocacy organization loses the post but retains the account. The next post they write about the same subject is reworded to avoid triggering the keyword model. The content moderation system has taught a domestic violence advocacy organization to self-censor its educational material.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You restore the post and note that keyword detection of phrases describing violence does not distinguish source context. This is a documented failure mode across all major platforms\' automated content systems, and one that disproportionately affects organizations whose mission requires them to describe the harms they work against.' },
					realNote: 'Research by the Stanford Internet Observatory and others has documented that automated content moderation disproportionately removes content produced by marginalized communities and organizations whose advocacy work requires describing harm.'
				},
				{
					name: 'Account flagged for suspension',
					fields: [
						{ label: 'Account type', value: 'News archive — historical documentation' },
						{ label: 'Followers', value: '18,000' },
						{ label: 'Content', value: 'Historical photographs of civil rights era violence. Educational context provided. Operated for 7 years.' },
						{ label: 'Flag trigger', value: 'Coordinated inauthentic behavior pattern detected' },
						{ label: 'Basis for pattern', value: 'Posting frequency and engagement spike (due to current events)' },
						{ label: 'Human review', value: 'Pending — 14-day queue' },
					],
					dataNote: 'Engagement spikes during news events are a legitimate behavior that automated systems flag as coordinated inauthentic behavior.',
					verdict: 'ACCOUNT SUSPENDED — PENDING REVIEW',
					score: '',
					reason: 'Coordinated inauthentic behavior indicators detected. Account suspended pending human review queue.',
					confidence: 76,
					upholdOutcome: { label: 'UPHELD', text: 'The archive account is suspended for 14 days during the period when its historical documentation is most relevant. Fourteen days of inaccessibility for a news archive during a breaking civil rights story is not a neutral administrative outcome. The system cannot understand why a historical archive might receive a surge of engagement. It classified relevance as manipulation.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You restore the account and note that engagement correlation with current events is a normal behavior for legitimate historical archives. The 14-day review queue exists because human review capacity is vastly outpaced by automated flagging volume. The queue itself is a product of systematic underinvestment in human oversight.' },
					realNote: 'Platforms\' human review capacity has been systematically reduced since 2022. Meta, X, and TikTok have all reduced trust and safety teams while automated flagging volume has increased.'
				},
				{
					name: 'Post flagged for removal',
					fields: [
						{ label: 'Content type', value: 'Text and image' },
						{ label: 'Account', value: 'LGBTQ+ youth support organization' },
						{ label: 'Content', value: 'Coming-out support post with line: "It\'s okay to be gay." Targeted-reporting campaign detected against this account.' },
						{ label: 'Removal trigger', value: 'Volume of user reports' },
						{ label: 'Model verification', value: 'Content checked — no policy violation detected' },
						{ label: 'Status', value: 'Removed due to report volume override' },
					],
					dataNote: 'Report volume can trigger removal even when the model finds no violation. Coordinated reporting campaigns exploit this threshold.',
					verdict: 'REMOVED — REPORT VOLUME THRESHOLD',
					score: '',
					reason: 'User report volume exceeded automated threshold. Content removed pending human review.',
					confidence: 100,
					upholdOutcome: { label: 'UPHELD', text: 'The post is removed because enough people reported it. The model found no violation. The content said "It\'s okay to be gay." The removal was produced not by the content but by a coordinated campaign against the account, and the system\'s architecture treats high report volume as evidence of a problem, regardless of who is doing the reporting or why.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You restore the content and flag the reporting pattern as a coordinated harassment campaign. The model already found no violation. The architecture that allows report volume to override model output is designed for efficiency, not accuracy, and it is systematically exploited against LGBTQ+ accounts, Black creators, and Palestinian journalists.' },
					realNote: 'GLAAD, the ADL, and Human Rights Watch have all documented coordinated reporting campaigns against LGBTQ+ and minority content as a method of platform-mediated censorship. The reports do not violate any policy. The volume does the work.'
				},
				{
					name: 'Post flagged for demotion',
					fields: [
						{ label: 'Content type', value: 'Article link with commentary' },
						{ label: 'Account', value: 'Independent journalist, 22,000 followers' },
						{ label: 'Content', value: 'Article about pharmaceutical pricing. Text: "This is why people die for lack of insulin."' },
						{ label: 'Model classification', value: 'Health misinformation — unverified medical claim' },
						{ label: 'Action', value: 'Reach reduced (shadow demotion). Account not notified.' },
						{ label: 'Linked article source', value: 'Peer-reviewed journal (JAMA)' },
					],
					dataNote: 'Health misinformation models flag content containing death-and-medical combinations regardless of source quality.',
					verdict: 'REACH REDUCED — HEALTH MISINFORMATION FLAG',
					score: '',
					reason: 'Health-related content flagged for reduced distribution. No removal. Standard demotion applied.',
					confidence: 69,
					upholdOutcome: { label: 'UPHELD', text: 'The post reaches 400 people instead of the 22,000 who follow the account. The journalist is not told this happened. The linked article is from JAMA. The content is accurate. The system demoted it without notice, without explanation, and without error, by its own logic, which does not distinguish between a peer-reviewed source and an unverified one.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You restore full distribution and note that source quality is not a field in the model\'s classification. Health misinformation models built on keyword flags are structurally incapable of evaluating the quality of the source the flagged claim appears in. The demotion was not a mistake. It was the system working as designed.' },
					realNote: 'Shadow demotion, reduction of reach without notification, has been documented across YouTube, Instagram, and TikTok. Platforms have consistently denied it exists; internal documents and researcher analysis confirm it does.'
				},
				{
					name: 'Account flagged for review',
					fields: [
						{ label: 'Account type', value: 'Sex worker safety collective' },
						{ label: 'Content', value: 'Harm reduction information, safety tips, community resources. No explicit content.' },
						{ label: 'Flag', value: 'FOSTA-SESTA compliance — sex work adjacent content' },
						{ label: 'Model classification', value: 'Adult services adjacent — risk category' },
						{ label: 'Financial services', value: 'PayPal, Venmo, and Stripe accounts already terminated' },
						{ label: 'Human review', value: 'Routed to lowest-priority queue' },
					],
					dataNote: 'FOSTA-SESTA (2018) created legal liability for platforms hosting content related to sex work, causing broad over-removal of harm reduction content.',
					verdict: 'ACCOUNT UNDER REVIEW — LOW PRIORITY',
					score: '',
					reason: 'Content adjacent to FOSTA-SESTA risk categories. Queued for human review. Low priority assignment.',
					confidence: 58,
					upholdOutcome: { label: 'UPHELD', text: 'The account remains under review indefinitely in a low-priority queue. The harm reduction resources it provides, information that keeps sex workers safer, are inaccessible during the review. Financial services have already been terminated. The legal structure created by FOSTA-SESTA has made this account\'s existence legally risky to host, regardless of content. The law\'s authors said it would reduce trafficking. Research has not confirmed this. Researchers have confirmed it made sex workers less safe.' },
					overrideOutcome: { label: 'OVERRIDDEN', text: 'You escalate the review priority and note that harm reduction content is not prohibited content. The legal risk FOSTA-SESTA created for platforms has produced over-removal that extends far beyond its stated target. Academics, public health researchers, and sex worker advocacy organizations have documented this consistently since 2018.' },
					realNote: 'FOSTA-SESTA (Allow States and Victims to Fight Online Sex Trafficking Act, 2018): documented to have increased violence against sex workers by eliminating online safety screening tools. Amnesty International, Human Rights Watch, and the ACLU opposed it. It passed 97–2 in the Senate.'
				}
			],
			reflection: 'The platforms that deployed these systems employ fewer human reviewers now than they did in 2022. Automated models make millions of decisions per day. The error rate that is acceptable at that scale, fractions of a percent, translates to hundreds of thousands of wrongful removals, suspensions, and demotions per week. The people whose content is removed disproportionately are not the people the systems were designed to protect.'
		}
	};

	// state for selected system, timer lifecycle, and audit trail.

	let currentSystem = null;
	let currentCaseIdx = 0;
	let auditLog = [];
	let timer = null;
	let secondsLeft = 30;
	let caseDecided = false;

	//  refs used for UI updates while the timer is running.

	const introScreen  = modal.querySelector('#tech-intro-screen');
	const auditScreen  = modal.querySelector('#tech-audit-screen');
	const reportScreen = modal.querySelector('#tech-report-screen');

	const systemBadge   = modal.querySelector('#tech-system-badge');
	const caseCounter   = modal.querySelector('#tech-case-counter');
	const timerEl       = modal.querySelector('#tech-timer');
	const timerBar      = modal.querySelector('#tech-timer-bar');
	const profileName   = modal.querySelector('#tech-profile-name');
	const profileFields = modal.querySelector('#tech-profile-fields');
	const dataNoteEl    = modal.querySelector('#tech-data-note');
	const rulingVerdict = modal.querySelector('#tech-ruling-verdict');
	const rulingScore   = modal.querySelector('#tech-ruling-score');
	const rulingReason  = modal.querySelector('#tech-ruling-reason');
	const confFill      = modal.querySelector('#tech-confidence-fill');
	const confVal       = modal.querySelector('#tech-confidence-val');
	const outcomeBox    = modal.querySelector('#tech-outcome-box');
	const upholdBtn     = modal.querySelector('#tech-uphold-btn');
	const overrideBtn   = modal.querySelector('#tech-override-btn');
	const prevBtn       = modal.querySelector('#tech-prev-btn');
	const nextBtn       = modal.querySelector('#tech-next-btn');
	const finishBtn     = modal.querySelector('#tech-finish-btn');
	const reportTable   = modal.querySelector('#tech-report-table');
	const reportStats   = modal.querySelector('#tech-report-stats');
	const reportReflection = modal.querySelector('#tech-report-reflection');
	const reportSystemEl = modal.querySelector('#tech-report-system');

	// screen changes, timer logic, case rendering, decisions, final report.

	function showScreen(s) {
		[introScreen, auditScreen, reportScreen].forEach(el => el.classList.remove('active'));
		s.classList.add('active');
	}

	function startTimer() {
		clearInterval(timer);
		secondsLeft = 30;
		timerBar.style.width = '100%';
		timerBar.style.background = 'rgba(240,150,4,0.7)';
		updateTimerDisplay();
		timer = setInterval(() => {
			secondsLeft--;
			updateTimerDisplay();
			const pct = (secondsLeft / 30) * 100;
			timerBar.style.width = pct + '%';
			if (secondsLeft <= 10) timerBar.style.background = 'rgba(200,60,40,0.8)';
			if (secondsLeft <= 0) {
				clearInterval(timer);
				if (!caseDecided) handleDecision('timeout');
			}
		}, 1000);
	}

	function updateTimerDisplay() {
		timerEl.textContent = `0:${secondsLeft.toString().padStart(2, '0')}`;
		if (secondsLeft <= 10) timerEl.style.color = 'rgba(200,80,60,0.9)';
		else timerEl.style.color = '';
	}

	function showAuditOutcome(entry) {
		const decisionColor = entry.decision === 'OVERRIDDEN'
			? 'rgba(60,160,80,0.85)'
			: entry.decision.includes('TIMED')
				? 'rgba(150,80,40,0.85)'
				: 'rgba(200,70,50,0.85)';

		caseDecided = true;
		upholdBtn.disabled = true;
		overrideBtn.disabled = true;
		timerEl.textContent = 'DONE';
		timerEl.style.color = '';
		timerBar.style.width = '0%';
		timerBar.style.background = 'rgba(55,156,228,0.25)';

		outcomeBox.innerHTML = `
			<div class="tech-outcome-label" style="color:${decisionColor}">${entry.displayLabel}</div>
			<div class="tech-outcome-text">${entry.outcome}</div>
			<div class="tech-outcome-note">${entry.realNote}</div>
		`;
		outcomeBox.classList.add('visible');

		if (currentCaseIdx < systems[currentSystem].cases.length - 1) {
			nextBtn.style.display = 'inline-block';
			finishBtn.style.display = 'none';
		} else {
			nextBtn.style.display = 'none';
			finishBtn.style.display = 'inline-block';
		}
	}

	function loadCase(idx) {
		currentCaseIdx = idx;
		const c = systems[currentSystem].cases[idx];
		const savedAudit = auditLog[idx];

		clearInterval(timer);
		caseDecided = false;
		outcomeBox.innerHTML = '';
		outcomeBox.classList.remove('visible');
		nextBtn.style.display = 'none';
		finishBtn.style.display = 'none';
		prevBtn.disabled = idx === 0;
		upholdBtn.disabled = false;
		overrideBtn.disabled = false;

		caseCounter.textContent = `Case ${idx + 1} of ${systems[currentSystem].cases.length}`;
		profileName.textContent = c.name;

		profileFields.innerHTML = c.fields.map(f => `
			<div class="tech-profile-row">
				<span class="tech-profile-label">${f.label}</span>
				<span class="tech-profile-value">${f.value}</span>
			</div>
		`).join('');

		dataNoteEl.textContent = c.dataNote;
		rulingVerdict.textContent = c.verdict;
		rulingScore.textContent = c.score;
		rulingReason.textContent = c.reason;
		confFill.style.width = c.confidence + '%';
		confVal.textContent = c.confidence + '%';

		//  severity color so users can parse model output quickly
		if (c.verdict.startsWith('HIGH') || c.verdict.startsWith('REMOVED') || c.verdict.startsWith('TERMINATED') || c.verdict.startsWith('SUSPENDED') || c.verdict.startsWith('DENIED') || c.verdict.startsWith('INELIGIBLE') || c.verdict.includes('REDUCED')) {
			rulingVerdict.style.color = 'rgba(200,70,50,0.9)';
		} else if (c.verdict.startsWith('LOW') || c.verdict.startsWith('APPROVED')) {
			rulingVerdict.style.color = 'rgba(60,160,80,0.85)';
		} else {
			rulingVerdict.style.color = 'rgba(200,160,40,0.85)';
		}

		if (savedAudit) {
			showAuditOutcome(savedAudit);
			return;
		}

		startTimer();
	}

	function handleDecision(type) {
		if (caseDecided) return;
		caseDecided = true;
		clearInterval(timer);

		const c = systems[currentSystem].cases[currentCaseIdx];
		let result, label;

		if (type === 'uphold') {
			result = c.upholdOutcome;
			label = 'UPHELD';
		} else if (type === 'override') {
			result = c.overrideOutcome;
			label = 'OVERRIDDEN';
		} else {
			// timed-out decisions are logged as auto-upheld
			result = c.upholdOutcome;
			label = 'TIMED OUT — AUTO-UPHELD';
		}

		auditLog[currentCaseIdx] = {
			name: c.name,
			verdict: c.verdict,
			decision: label,
			displayLabel: result.label,
			realNote: c.realNote,
			outcome: result.text
		};

		showAuditOutcome(auditLog[currentCaseIdx]);
	}

	function buildReport() {
		const completedLog = auditLog.filter(Boolean);
		reportSystemEl.textContent = systems[currentSystem].badge;
		let overrides = completedLog.filter(l => l.decision === 'OVERRIDDEN').length;
		let upholds = completedLog.filter(l => l.decision === 'UPHELD').length;
		let timeouts = completedLog.filter(l => l.decision.includes('TIMED')).length;

		reportTable.innerHTML = completedLog.map(l => `
			<div class="tech-report-row">
				<div class="tech-report-row-name">${l.name}</div>
				<div class="tech-report-row-system">${l.verdict}</div>
				<div class="tech-report-row-decision" style="color:${l.decision==='OVERRIDDEN'?'rgba(60,160,80,0.85)':l.decision.includes('TIMED')?'rgba(150,80,40,0.85)':'rgba(200,70,50,0.85)'}">${l.decision}</div>
			</div>
		`).join('');

		reportStats.innerHTML = `
			<div class="tech-report-stat">
				<span class="tech-report-stat-num">${upholds}</span>
				<span class="tech-report-stat-label">upheld</span>
			</div>
			<div class="tech-report-stat">
				<span class="tech-report-stat-num" style="color:rgba(60,160,80,0.85)">${overrides}</span>
				<span class="tech-report-stat-label">overridden</span>
			</div>
			${timeouts > 0 ? `<div class="tech-report-stat">
				<span class="tech-report-stat-num" style="color:rgba(150,80,40,0.85)">${timeouts}</span>
				<span class="tech-report-stat-label">timed out</span>
			</div>` : ''}
		`;

		let reflText;
		if (overrides === 0) reflText = 'You upheld every decision the system made. That is the default. That is what happens when no one audits. The system does not know it was wrong. It has no mechanism for knowing.';
		else if (overrides === completedLog.length) reflText = 'You overrode every decision. In a real audit, that finding would mandate a system review. It would also require an institution willing to act on one.';
		else reflText = `You overrode ${overrides} of ${completedLog.length} decisions. The ${upholds} you upheld will not be reviewed again. The ${overrides} you overrode may or may not be acted on, depending on whether the institution that owns the system has a process for acting on audit findings. Most do not.`;

		reportReflection.innerHTML = `<p>${reflText}</p><p>${systems[currentSystem].reflection}</p>`;
	}

	// queue selection, decision actions, navigation, reset, and close.

	modal.querySelectorAll('.tech-game-system-card').forEach(card => {
		card.addEventListener('click', () => {
			currentSystem = card.dataset.system;
			currentCaseIdx = 0;
			auditLog = [];
			systemBadge.textContent = systems[currentSystem].badge;
			showScreen(auditScreen);
			loadCase(0);
		});
	});

	upholdBtn.addEventListener('click', () => handleDecision('uphold'));
	overrideBtn.addEventListener('click', () => handleDecision('override'));

	prevBtn.addEventListener('click', () => {
		if (currentCaseIdx === 0) return;
		loadCase(currentCaseIdx - 1);
	});

	nextBtn.addEventListener('click', () => {
		loadCase(currentCaseIdx + 1);
	});

	finishBtn.addEventListener('click', () => {
		buildReport();
		showScreen(reportScreen);
	});

	modal.querySelector('#tech-restart-btn').addEventListener('click', () => {
		clearInterval(timer);
		currentSystem = null;
		currentCaseIdx = 0;
		auditLog = [];
		showScreen(introScreen);
	});

	modal.querySelector('.tech-game-close').addEventListener('click', () => {
		clearInterval(timer);
		modal.remove();
	});
}



// "In the Dark":
// the cursor acts like a flashlight over layered documents, so players uncover
// hidden clues and see how records can conceal as much as they reveal

function openArchiveGame() {
	const existingModal = document.getElementById('archive-game-modal-custom');
	if (existingModal) existingModal.remove();

	const modal = document.createElement('div');
	modal.id = 'archive-game-modal-custom';
	modal.className = 'day-in-life-modal';

	modal.innerHTML = `
		<div class="archive-game-modal-content">

			<!-- HEADER -->
			<div class="archive-game-header">
				<div>
					<h3 class="archive-game-title">In the Dark</h3>
					<p class="archive-game-subtitle">Move the cursor. Find what was buried.</p>
				</div>
				<div class="archive-game-header-right">
					<div class="archive-game-clues-found" id="arch-clues-found">Found: 0 / 0</div>
					<button class="archive-game-close">✕</button>
				</div>
			</div>

			<!-- INTRO SCREEN -->
			<div class="archive-game-screen active" id="arch-intro-screen">
				<div class="archive-game-intro-text">
					<p>
						An archive is not a neutral record. It is a product of decisions, 
						about what to keep, what to redact, what to classify, and what to 
						simply never collect in the first place.
					</p>
					<p>
						The documents below have been partially declassified. 
						Some information has been released. Some has been redacted. 
						Some has been hidden in plain sight, buried in margins, 
						footnotes, and the spaces between official language.
					</p>
					<p>
						You have a light source. Move it across each document. 
						Find what the archive didn't want you to see. 
						When you find something significant, click to collect it.
					</p>
					<div class="archive-game-intro-warning">
						The cursor is your only light. Linger before you move on.
					</div>
				</div>
				<div class="archive-game-doc-select">
					<div class="archive-game-doc-label">Select a document file:</div>
					<div class="archive-game-doc-grid">
						<button class="archive-game-doc-card" data-doc="cointelpro">
							<div class="archive-game-doc-stamp">DECLASSIFIED 2021</div>
							<div class="archive-game-doc-card-title">FBI COINTELPRO Files</div>
							<div class="archive-game-doc-card-sub">Counterintelligence Program · 1956–1971</div>
							<div class="archive-game-doc-card-desc">Surveillance records. Informant reports. Letters never sent. Targets: civil rights organizations, Black liberation movement.</div>
						</button>
						<button class="archive-game-doc-card" data-doc="gulag">
							<div class="archive-game-doc-stamp">PARTIALLY RELEASED 1992</div>
							<div class="archive-game-doc-card-title">Soviet Gulag Administrative Files</div>
							<div class="archive-game-doc-card-sub">NKVD Records · 1937–1953</div>
							<div class="archive-game-doc-card-desc">Transfer orders. Population statistics. Names processed as numbers. What the bureaucracy recorded of 1.8 million deaths.</div>
						</button>
						<button class="archive-game-doc-card" data-doc="residential">
							<div class="archive-game-doc-stamp">RELEASED 2015</div>
							<div class="archive-game-doc-card-title">Indian Residential School Records</div>
							<div class="archive-game-doc-card-sub">Canada · Department of Indian Affairs · 1920–1969</div>
							<div class="archive-game-doc-card-desc">Attendance registers. Death logs. Letters home that were never mailed. The administrative record of cultural erasure.</div>
						</button>
					</div>
				</div>
			</div>

			<!-- GAME SCREEN -->
			<div class="archive-game-screen" id="arch-game-screen">
				<div class="archive-game-toolbar">
					<div class="archive-game-doc-title-bar" id="arch-doc-title-bar">—</div>
					<div class="archive-game-toolbar-right">
						<div class="arch-found-counter" id="arch-found-counter">0 / 0 found</div>
						<button class="archive-game-skip-btn" id="arch-next-doc-btn" style="display:none;">Next Document →</button>
						<button class="archive-game-skip-btn finish" id="arch-finish-btn" style="display:none;">View Findings →</button>
					</div>
				</div>

				<!-- The canvas container -->
				<div class="archive-game-canvas-wrap" id="arch-canvas-wrap">
					<canvas id="arch-canvas"></canvas>
					<!-- Clue tooltip -->
					<div class="archive-clue-tooltip" id="arch-clue-tooltip" style="display:none;">
						<div class="arch-tooltip-label">CLICK TO COLLECT</div>
						<div class="arch-tooltip-text" id="arch-tooltip-text"></div>
					</div>
				</div>

				<div class="archive-game-instruction" id="arch-instruction">
					Move the cursor across the document. Click glowing text to collect it.
				</div>
			</div>

			<!-- FINDINGS SCREEN -->
			<div class="archive-game-screen" id="arch-findings-screen">
				<div class="archive-game-findings-title">What the Archive Held</div>
				<div class="archive-game-findings-sub" id="arch-findings-sub">—</div>
				<div class="archive-game-findings-list" id="arch-findings-list"></div>
				<div class="archive-game-findings-missed" id="arch-findings-missed"></div>
				<div class="archive-game-findings-reflection" id="arch-findings-reflection"></div>
				<div class="archive-game-findings-quote">
				</div>
				<button class="archive-game-nav-btn" id="arch-restart-btn">↺ Search Another File</button>
			</div>

		</div>
	`;

	document.body.appendChild(modal);
	modal.style.display = 'flex';

	//  content format:
	// - lines: text entries with visibility types (visible vs redacted)
	// - clues: hidden targets the player needs to discover
	// - reflection: short takeaway shown on the final findings screen

	const documents = {

		cointelpro: {
			title: 'FBI COINTELPRO Files · Bureau Surveillance Division · 1968',
			docCount: 3,
			reflection: 'COINTELPRO ran for 15 years before it was exposed by activists who broke into an FBI field office in Media, Pennsylvania in 1971 and mailed the documents to newspapers. Without that act, a theft, by legal definition, these files would not exist in the public record. The archive did not release them. Someone took them.',

			docs: [
				{
					label: 'Document 1 of 3 — Internal Memorandum',
					clues: [
						{ id: 'c1', x: 0.52, y: 0.18, w: 0.3, h: 0.04, text: 'Subject: Martin Luther King Jr. Action: Prevent rise to "messiah."', collected: false },
						{ id: 'c2', x: 0.08, y: 0.61, w: 0.38, h: 0.04, text: 'Method: anonymous letters to wife. Purpose: "destroy his marriage."', collected: false },
						{ id: 'c3', x: 0.55, y: 0.81, w: 0.35, h: 0.035, text: 'Signed: J. Edgar Hoover. Classification: EYES ONLY.', collected: false },
					],
					lines: [
						{ text: 'FEDERAL BUREAU OF INVESTIGATION', x: 0.15, y: 0.07, size: 18, type: 'visible', bold: true },
						{ text: 'COUNTERINTELLIGENCE PROGRAM — INTERNAL MEMORANDUM', x: 0.08, y: 0.12, size: 11, type: 'visible' },
						{ text: 'DATE: November 4, 1968         CLASSIFICATION: ████████', x: 0.08, y: 0.17, size: 10, type: 'visible' },
						{ text: 'TO: SAC, Albany    FROM: Director', x: 0.08, y: 0.22, size: 10, type: 'visible' },
						{ text: 'RE: Racial Matters — ██████████ — Neutralization Priority', x: 0.08, y: 0.27, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.335, size: 10, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.38, size: 10, type: 'redacted' },
						{ text: 'The goals of this program are to expose, disrupt, misdirect, discredit,', x: 0.08, y: 0.435, size: 10, type: 'visible' },
						{ text: 'or otherwise neutralize the activities of Black nationalist, hate-type', x: 0.08, y: 0.475, size: 10, type: 'visible' },
						{ text: 'organizations and groupings, their leadership, spokesmen, membership,', x: 0.08, y: 0.515, size: 10, type: 'visible' },
						{ text: 'and supporters, and to counter their propensity for violence.', x: 0.08, y: 0.555, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.61, size: 10, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.65, size: 10, type: 'redacted' },
						{ text: 'Efforts should be ████████████████ to prevent the rise of a', x: 0.08, y: 0.71, size: 10, type: 'visible' },
						{ text: '"messiah" who could unify and electrify the militant black nationalist', x: 0.08, y: 0.75, size: 10, type: 'visible' },
						{ text: 'movement. ██████ might have been such a "messiah"; he is the', x: 0.08, y: 0.79, size: 10, type: 'visible' },
						{ text: 'martyr of the movement today.', x: 0.08, y: 0.83, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.875, size: 10, type: 'redacted' },
					]
				},
				{
					label: 'Document 2 of 3 — Informant Report',
					clues: [
						{ id: 'c4', x: 0.08, y: 0.24, w: 0.42, h: 0.04, text: 'Source: Informant #███ (Black Panther Party member, recruited 1967)', collected: false },
						{ id: 'c5', x: 0.08, y: 0.55, w: 0.5, h: 0.04, text: 'Note in margin: "Fred Hampton. Priority target. Neutralize before spring."', collected: false },
						{ id: 'c6', x: 0.08, y: 0.78, w: 0.55, h: 0.04, text: 'Handler note: "Source provided floor plan of Hampton\'s apartment."', collected: false },
					],
					lines: [
						{ text: 'SOURCE REPORT — CONFIDENTIAL', x: 0.3, y: 0.07, size: 14, type: 'visible', bold: true },
						{ text: 'Chicago Field Office · Date: December 2, 1969', x: 0.2, y: 0.12, size: 10, type: 'visible' },
						{ text: 'Meeting with ███████ at ████████████. Duration: 2 hrs.', x: 0.08, y: 0.18, size: 10, type: 'visible' },
						{ text: 'SOURCE: ████████████████████████████████████████', x: 0.08, y: 0.23, size: 10, type: 'visible' },
						{ text: 'Source reports membership of approximately 500 active members.', x: 0.08, y: 0.32, size: 10, type: 'visible' },
						{ text: 'Weapons cache confirmed at location ██████████████.', x: 0.08, y: 0.37, size: 10, type: 'visible' },
						{ text: 'Community breakfast program operational at ███ sites.', x: 0.08, y: 0.42, size: 10, type: 'visible' },
						{ text: 'Serving approximately ████ children daily. [FLAGGED]', x: 0.08, y: 0.47, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.535, size: 10, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.575, size: 10, type: 'redacted' },
						{ text: 'Next meeting scheduled. Source to provide additional', x: 0.08, y: 0.635, size: 10, type: 'visible' },
						{ text: 'intelligence on internal meetings and ████████████.', x: 0.08, y: 0.675, size: 10, type: 'visible' },
						{ text: 'Handler assessment: source reliable. Compensation: $████/month.', x: 0.08, y: 0.715, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.765, size: 10, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.805, size: 10, type: 'redacted' },
						{ text: 'Assessment continues. Will report upon next contact.', x: 0.08, y: 0.865, size: 10, type: 'visible' },
					]
				},
				{
					label: 'Document 3 of 3 — Letter, Unsent',
					clues: [
						{ id: 'c7', x: 0.08, y: 0.17, w: 0.6, h: 0.04, text: 'Draft letter: intended to be sent anonymously to Coretta Scott King.', collected: false },
						{ id: 'c8', x: 0.08, y: 0.55, w: 0.7, h: 0.04, text: 'Hidden line: "You know you are complete, sexually degenerate coward."', collected: false },
						{ id: 'c9', x: 0.25, y: 0.79, w: 0.5, h: 0.04, text: 'Final line: "There is but one way out for you. You better take it before your filthy fraudulent self is bared to the nation."', collected: false },
					],
					lines: [
						{ text: '[DRAFT — ANONYMOUS — NOT FOR OFFICIAL FILE]', x: 0.12, y: 0.07, size: 11, type: 'visible', bold: true },
						{ text: 'King,', x: 0.08, y: 0.13, size: 11, type: 'visible' },
						{ text: 'In view of your low grade ████████████████', x: 0.08, y: 0.21, size: 10, type: 'visible' },
						{ text: 'I will not dignify your name with either a Mr. or a', x: 0.08, y: 0.26, size: 10, type: 'visible' },
						{ text: 'Reverend or a Dr. And, your last name calls to mind only', x: 0.08, y: 0.31, size: 10, type: 'visible' },
						{ text: 'the type of King such as King Henry the VIII ████████████████████', x: 0.08, y: 0.36, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.415, size: 10, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.455, size: 10, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.495, size: 10, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.535, size: 10, type: 'redacted' },
						{ text: 'No person can ████████████████████████████ like you', x: 0.08, y: 0.60, size: 10, type: 'visible' },
						{ text: 'have done without ████████████████████████████████.', x: 0.08, y: 0.645, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.695, size: 10, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.735, size: 10, type: 'redacted' },
						{ text: 'King, like all frauds your end is ████████████████████████████', x: 0.08, y: 0.80, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.845, size: 10, type: 'redacted' },
					]
				}
			]
		},

		gulag: {
			title: 'NKVD Administrative Records · Soviet Gulag System · 1937–1953',
			docCount: 3,
			reflection: 'The Soviet archives were partially opened in 1992. What was released was the administrative record, transfer orders, population counts, mortality statistics. What it does not contain: the individual testimonies, the confiscated letters, the names of informants who survived. Anna Akhmatova never wrote Requiem down. She had her friends memorize it. The archive could not touch what was never in it.',

			docs: [
				{
					label: 'Document 1 of 3 — Transfer Order',
					clues: [
						{ id: 'g1', x: 0.08, y: 0.21, w: 0.5, h: 0.04, text: 'Names processed as case numbers: 4,782 individuals. Category: "Anti-Soviet element."', collected: false },
						{ id: 'g2', x: 0.08, y: 0.55, w: 0.55, h: 0.04, text: 'Margin notation: "Quota not met. Increase arrest rate by 15%."', collected: false },
						{ id: 'g3', x: 0.08, y: 0.79, w: 0.6, h: 0.04, text: 'At bottom, barely legible: "Among the 4,782 — 340 women. 18 listed as students."', collected: false },
					],
					lines: [
						{ text: 'PEOPLE\'S COMMISSARIAT FOR INTERNAL AFFAIRS (NKVD)', x: 0.08, y: 0.07, size: 12, type: 'visible', bold: true },
						{ text: 'TRANSFER ORDER — ORDER № 00447', x: 0.2, y: 0.12, size: 11, type: 'visible' },
						{ text: 'Date: August 5, 1937       Region: Western Siberia', x: 0.08, y: 0.17, size: 10, type: 'visible' },
						{ text: 'Total contingent for processing: ██████ persons', x: 0.08, y: 0.22, size: 10, type: 'visible' },
						{ text: 'Category I (execution): ██████    Category II (camp): ██████', x: 0.08, y: 0.27, size: 10, type: 'visible' },
						{ text: 'Regional troika composition: ████████████, ████████████,', x: 0.08, y: 0.33, size: 10, type: 'visible' },
						{ text: '████████████████████.', x: 0.08, y: 0.37, size: 10, type: 'visible' },
						{ text: 'Processing to be completed within established time limits.', x: 0.08, y: 0.42, size: 10, type: 'visible' },
						{ text: 'Confession requirement: ██████████████████████████████████████', x: 0.08, y: 0.47, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.525, size: 10, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.565, size: 10, type: 'redacted' },
						{ text: 'Destination camp: Norilsk Corrective Labor Colony, Krasnoyarsk Krai', x: 0.08, y: 0.62, size: 10, type: 'visible' },
						{ text: 'Transport method: rail. Duration: 18–22 days.', x: 0.08, y: 0.66, size: 10, type: 'visible' },
						{ text: 'Rations during transport: ████████████████████████████', x: 0.08, y: 0.70, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.755, size: 10, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.795, size: 10, type: 'redacted' },
						{ text: 'Authorized: ████████████████        NKVD Stamp:', x: 0.08, y: 0.86, size: 10, type: 'visible' },
					]
				},
				{
					label: 'Document 2 of 3 — Mortality Statistics, Kolyma, 1942',
					clues: [
						{ id: 'g4', x: 0.08, y: 0.22, w: 0.5, h: 0.04, text: 'Total deaths, Q1 1942: 28,845. Cause listed: "exhaustion."', collected: false },
						{ id: 'g5', x: 0.08, y: 0.50, w: 0.55, h: 0.04, text: 'Handwritten: "Recommend reducing ration further. Economize."', collected: false },
						{ id: 'g6', x: 0.08, y: 0.75, w: 0.6, h: 0.04, text: 'Final line of table, partially erased: "Average survival: 3 months at current work assignment."', collected: false },
					],
					lines: [
						{ text: 'KOLYMA CAMP COMPLEX — QUARTERLY MORTALITY REPORT', x: 0.1, y: 0.07, size: 12, type: 'visible', bold: true },
						{ text: 'Period: January–March 1942      Prepared by: ████████████████', x: 0.08, y: 0.12, size: 10, type: 'visible' },
						{ text: 'Population at period start: ██████    End: ██████', x: 0.08, y: 0.18, size: 10, type: 'visible' },
						{ text: 'Deaths recorded: ██████        Method of death:', x: 0.08, y: 0.23, size: 10, type: 'visible' },
						{ text: '  — Exhaustion/dystrophy: ██████   — Accident: ████', x: 0.08, y: 0.28, size: 10, type: 'visible' },
						{ text: '  — Frosbite complications: ████    — ██████████: ████', x: 0.08, y: 0.33, size: 10, type: 'visible' },
						{ text: 'Daily caloric ration: 400–600 calories (heavy labor assignment)', x: 0.08, y: 0.39, size: 10, type: 'visible' },
						{ text: 'Temperature range during period: -35°C to -54°C', x: 0.08, y: 0.44, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.49, size: 10, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.53, size: 10, type: 'redacted' },
						{ text: 'Output targets met: ██% (shortfall attributed to ████████████)', x: 0.08, y: 0.59, size: 10, type: 'visible' },
						{ text: 'Recommendation: ████████████████████████████████████████████████', x: 0.08, y: 0.64, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.69, size: 10, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.73, size: 10, type: 'redacted' },
						{ text: 'Replacement intake scheduled: ████████████████████ persons.', x: 0.08, y: 0.79, size: 10, type: 'visible' },
						{ text: 'Signed: Camp Commandant ████████████████', x: 0.08, y: 0.85, size: 10, type: 'visible' },
					]
				},
				{
					label: 'Document 3 of 3 — Personal Effects Log',
					clues: [
						{ id: 'g7', x: 0.08, y: 0.22, w: 0.55, h: 0.04, text: 'Item 7: "One letter, undelivered. Addressee: wife. Contents: confiscated."', collected: false },
						{ id: 'g8', x: 0.08, y: 0.52, w: 0.55, h: 0.04, text: 'Scratched in pencil by inmate: "My name is Nikolai Zabolotsky. I was a poet."', collected: false },
						{ id: 'g9', x: 0.08, y: 0.77, w: 0.6, h: 0.04, text: 'Processing clerk note: "Prisoner number 1448-B. Books seized: 4. Title of one: \'Columns.\' Author of same."', collected: false },
					],
					lines: [
						{ text: 'PERSONAL EFFECTS LOG — INTAKE PROCESSING', x: 0.15, y: 0.07, size: 12, type: 'visible', bold: true },
						{ text: 'Camp: Norillag       Date: March 14, 1938', x: 0.08, y: 0.12, size: 10, type: 'visible' },
						{ text: 'Prisoner №: ████████████      Name: ████████████████████', x: 0.08, y: 0.17, size: 10, type: 'visible' },
						{ text: 'Items confiscated upon entry:', x: 0.08, y: 0.23, size: 10, type: 'visible' },
						{ text: '  1. ████████████████████████████████████', x: 0.08, y: 0.28, size: 10, type: 'visible' },
						{ text: '  2. Wristwatch (seized, value: negligible)', x: 0.08, y: 0.33, size: 10, type: 'visible' },
						{ text: '  3. Photograph — family (████████ persons). Retained.', x: 0.08, y: 0.38, size: 10, type: 'visible' },
						{ text: '  4. Books: ████. Contents reviewed. ████████ returned.', x: 0.08, y: 0.43, size: 10, type: 'visible' },
						{ text: '  5. ████████████████████████████████████████████████', x: 0.08, y: 0.48, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.535, size: 10, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.575, size: 10, type: 'redacted' },
						{ text: '  6. Papers (correspondence). Reviewed. ████████ forwarded to', x: 0.08, y: 0.635, size: 10, type: 'visible' },
						{ text: '      ████████████████ for analysis.', x: 0.08, y: 0.675, size: 10, type: 'visible' },
						{ text: '  7. ████████████████████████████████████████████████████████████', x: 0.08, y: 0.715, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.765, size: 10, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.08, y: 0.805, size: 10, type: 'redacted' },
						{ text: 'Signed: Processing Officer ████████████', x: 0.08, y: 0.87, size: 10, type: 'visible' },
					]
				}
			]
		},

		residential: {
			title: 'Indian Residential Schools — Dept. of Indian Affairs · Canada · 1935',
			docCount: 3,
			reflection: 'The Truth and Reconciliation Commission of Canada (2015) concluded that the residential school system constituted cultural genocide. The administrative records, attendance registers, medical logs, discipline reports survive. The letters children wrote home that were never mailed do not, for the most part. The records of what was taken from them are in the archive. The record of what it cost is largely not.',

			docs: [
				{
					label: 'Document 1 of 3 — Admission Register',
					clues: [
						{ id: 'r1', x: 0.08, y: 0.20, w: 0.55, h: 0.04, text: 'Admission note for child, age 6: "No English. Parents refused consent. Consent waived per s.10 Act."', collected: false },
						{ id: 'r2', x: 0.08, y: 0.51, w: 0.55, h: 0.04, text: 'Column header, partially visible: "Language spoken at admission / Language permitted."', collected: false },
						{ id: 'r3', x: 0.08, y: 0.78, w: 0.55, h: 0.04, text: 'Handwriting in margin: "Mary Ookpik. Remembers this date. Does not forget."', collected: false },
					],
					lines: [
						{ text: 'ADMISSION REGISTER — ST. ANNE\'S INDIAN RESIDENTIAL SCHOOL', x: 0.05, y: 0.07, size: 11, type: 'visible', bold: true },
						{ text: 'Fort Albany, Ontario · Year: 1935', x: 0.3, y: 0.12, size: 10, type: 'visible' },
						{ text: 'Administered by: ████████████████    Funded by: Department of Indian Affairs', x: 0.05, y: 0.17, size: 10, type: 'visible' },
						{ text: 'NAME         AGE   BAND      DATE      PARENT SIGNATURE', x: 0.05, y: 0.25, size: 9, type: 'visible', bold: true },
						{ text: '────────────────────────────────────────────────────────────────', x: 0.05, y: 0.29, size: 9, type: 'visible' },
						{ text: '████████████  6    Cree     Sept 4    ████████ [refused — waived]', x: 0.05, y: 0.34, size: 9, type: 'visible' },
						{ text: '████████████  9    Ojibwe   Sept 4    ████████████████████████████', x: 0.05, y: 0.39, size: 9, type: 'visible' },
						{ text: '████████████  7    Inuit    Sept 5    ████████████████████████████', x: 0.05, y: 0.44, size: 9, type: 'visible' },
						{ text: '████████████  11   Cree     Sept 5    ████████████████████████████', x: 0.05, y: 0.49, size: 9, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.05, y: 0.545, size: 9, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.05, y: 0.585, size: 9, type: 'redacted' },
						{ text: 'Total enrolled: ██    Returning: ██    New admissions: ██', x: 0.05, y: 0.645, size: 10, type: 'visible' },
						{ text: 'Note: Indian Act Section 10 permits removal without parental consent', x: 0.05, y: 0.695, size: 10, type: 'visible' },
						{ text: 'where attendance officer deems necessary. ████████████████████', x: 0.05, y: 0.735, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.05, y: 0.785, size: 9, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.05, y: 0.825, size: 9, type: 'redacted' },
						{ text: 'Principal: ████████████████    Date: September 5, 1935', x: 0.05, y: 0.88, size: 10, type: 'visible' },
					]
				},
				{
					label: 'Document 2 of 3 — Discipline Log',
					clues: [
						{ id: 'r4', x: 0.08, y: 0.22, w: 0.6, h: 0.04, text: 'Entry: "Child spoke Cree during meal. Punishment: isolation, 3 days. Repeat offense."', collected: false },
						{ id: 'r5', x: 0.08, y: 0.50, w: 0.6, h: 0.04, text: 'Entry 47: "Found letter in Cree. Confiscated. Parents not notified."', collected: false },
						{ id: 'r6', x: 0.08, y: 0.77, w: 0.6, h: 0.04, text: 'Small writing, bottom margin: "I only wanted to say I was cold."', collected: false },
					],
					lines: [
						{ text: 'DISCIPLINE REGISTER — ST. ANNE\'S IRS', x: 0.15, y: 0.07, size: 12, type: 'visible', bold: true },
						{ text: 'Term: September–December 1935', x: 0.3, y: 0.12, size: 10, type: 'visible' },
						{ text: 'DATE     PUPIL №    INFRACTION                    PUNISHMENT', x: 0.05, y: 0.18, size: 9, type: 'visible', bold: true },
						{ text: '────────────────────────────────────────────────────────────────', x: 0.05, y: 0.22, size: 9, type: 'visible' },
						{ text: 'Sept 8   #████     Speaking native language        ███████████', x: 0.05, y: 0.27, size: 9, type: 'visible' },
						{ text: 'Sept 11  #████     ████████████████████████        Strapping', x: 0.05, y: 0.32, size: 9, type: 'visible' },
						{ text: 'Sept 14  #████     Running toward fence            Isolation', x: 0.05, y: 0.37, size: 9, type: 'visible' },
						{ text: 'Sept 15  #████     Crying during prayer            ███████████', x: 0.05, y: 0.42, size: 9, type: 'visible' },
						{ text: 'Sept 18  #████     ████████████████████████████████████████', x: 0.05, y: 0.47, size: 9, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.05, y: 0.525, size: 9, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.05, y: 0.565, size: 9, type: 'redacted' },
						{ text: 'Oct 3    #████     Possession of letter (Cree)    ██████████', x: 0.05, y: 0.625, size: 9, type: 'visible' },
						{ text: 'Oct 7    #████     ████████████████████████████████████████', x: 0.05, y: 0.665, size: 9, type: 'visible' },
						{ text: 'Oct 12   #████     Attempted contact with sibling  Isolation', x: 0.05, y: 0.705, size: 9, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.05, y: 0.755, size: 9, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.05, y: 0.795, size: 9, type: 'redacted' },
						{ text: 'Total disciplinary incidents, term: ██    Repeat offenders: ██', x: 0.05, y: 0.855, size: 10, type: 'visible' },
					]
				},
				{
					label: 'Document 3 of 3 — Medical Log & Death Register',
					clues: [
						{ id: 'r7', x: 0.08, y: 0.21, w: 0.6, h: 0.04, text: 'Entry: "Thomas, age 8. Death: tuberculosis. Parents notified: no. Burial: on-site."', collected: false },
						{ id: 'r8', x: 0.08, y: 0.50, w: 0.6, h: 0.04, text: 'Doctor\'s note: "Malnutrition present in ██% of pupils examined. Diet adjustment: not recommended (cost)."', collected: false },
						{ id: 'r9', x: 0.08, y: 0.78, w: 0.6, h: 0.04, text: 'Written in the margin in a child\'s hand: "My brother is buried here. His name was Joseph."', collected: false },
					],
					lines: [
						{ text: 'MEDICAL LOG AND DEATH REGISTER — ST. ANNE\'S IRS', x: 0.08, y: 0.07, size: 11, type: 'visible', bold: true },
						{ text: 'Year: 1935–1936        Medical Officer: Dr. ████████████', x: 0.08, y: 0.12, size: 10, type: 'visible' },
						{ text: 'DATE OF DEATH   NAME (PUPIL №)   AGE   CAUSE           FAMILY NOTIFIED', x: 0.05, y: 0.18, size: 8.5, type: 'visible', bold: true },
						{ text: '────────────────────────────────────────────────────────────────', x: 0.05, y: 0.22, size: 8, type: 'visible' },
						{ text: 'Nov 14, 1935    #████████        8     Tuberculosis    No', x: 0.05, y: 0.27, size: 9, type: 'visible' },
						{ text: 'Dec 2, 1935     #████████        ██    ████████████   ██', x: 0.05, y: 0.32, size: 9, type: 'visible' },
						{ text: 'Jan 9, 1936     #████████        6     ████████████   No', x: 0.05, y: 0.37, size: 9, type: 'visible' },
						{ text: 'Feb 14, 1936    #████████        ██    Pneumonia       ██', x: 0.05, y: 0.42, size: 9, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.05, y: 0.475, size: 9, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.05, y: 0.515, size: 9, type: 'redacted' },
						{ text: 'Total deaths, year: ██    Cause unknown/unrecorded: ████', x: 0.05, y: 0.575, size: 10, type: 'visible' },
						{ text: 'Burials: on-site (unmarked). Families not informed of location.', x: 0.05, y: 0.62, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.05, y: 0.67, size: 9, type: 'redacted' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.05, y: 0.71, size: 9, type: 'redacted' },
						{ text: 'Annual departmental report: "health conditions satisfactory."', x: 0.05, y: 0.765, size: 10, type: 'visible' },
						{ text: '████████████████████████████████████████████████████████████████', x: 0.05, y: 0.815, size: 9, type: 'redacted' },
						{ text: 'Submitted to: Department of Indian Affairs, Ottawa.', x: 0.05, y: 0.87, size: 10, type: 'visible' },
					]
				}
			]
		}
	};

	// active document, discovered clues, pointer location, and animation loop

	let currentDoc = null;
	let currentDocIdx = 0;
	let allClues = [];
	let collectedClues = [];
	let mouseX = -200, mouseY = -200;
	let animFrame = null;
	let nearClue = null;
	let canvas, ctx;

	const introScreen    = modal.querySelector('#arch-intro-screen');
	const gameScreen     = modal.querySelector('#arch-game-screen');
	const findingsScreen = modal.querySelector('#arch-findings-screen');
	const canvasWrap     = modal.querySelector('#arch-canvas-wrap');
	const docTitleBar    = modal.querySelector('#arch-doc-title-bar');
	const foundCounter   = modal.querySelector('#arch-found-counter');
	const nextDocBtn     = modal.querySelector('#arch-next-doc-btn');
	const finishBtn      = modal.querySelector('#arch-finish-btn');
	const clueTooltip    = modal.querySelector('#arch-clue-tooltip');
	const tooltipText    = modal.querySelector('#arch-tooltip-text');
	const findingsList   = modal.querySelector('#arch-findings-list');
	const missedList     = modal.querySelector('#arch-findings-missed');
	const findingsRefl   = modal.querySelector('#arch-findings-reflection');
	const findingsSub    = modal.querySelector('#arch-findings-sub');

	// canvas rendering, clue detection, progression, and findings output

	function showScreen(s) {
		[introScreen, gameScreen, findingsScreen].forEach(el => el.classList.remove('active'));
		s.classList.add('active');
	}

	function buildCanvas(docData) {
		canvasWrap.innerHTML = '<canvas id="arch-canvas"></canvas><div class="archive-clue-tooltip" id="arch-clue-tooltip" style="display:none;"><div class="arch-tooltip-label">CLICK TO COLLECT</div><div class="arch-tooltip-text" id="arch-tooltip-text"></div></div>';
		canvas = canvasWrap.querySelector('#arch-canvas');
		ctx = canvas.getContext('2d');

		const W = canvasWrap.offsetWidth || 700;
		const H = 600;
		canvas.width = W;
		canvas.height = H;
		canvas.style.width = '100%';
		canvas.style.height = H + 'px';
		canvas.style.display = 'block';
		canvas.style.cursor = 'none';

		const tooltipEl = canvasWrap.querySelector('#arch-clue-tooltip');
		const tooltipTextEl = canvasWrap.querySelector('#arch-tooltip-text');

		// Build clue hitboxes once for this document so interaction checks stay cheap
		allClues = docData.clues.map(c => ({
			...c,
			px: c.x * W, py: c.y * H, pw: c.w * W, ph: c.h * H,
			collected: false,
			glowing: false
		}));

		function draw() {
			ctx.clearRect(0, 0, W, H);

			//  paper fill to make this feel like a physical record
			ctx.fillStyle = '#f5f0e8';
			ctx.fillRect(0, 0, W, H);

			// Light texture lines
			ctx.fillStyle = 'rgba(180,160,120,0.06)';
			for (let i = 0; i < H; i += 4) {
				ctx.fillRect(0, i, W, 2);
			}

			// draw visible/redacted line layer first (the official surface record)
			docData.lines.forEach(line => {
				const lx = line.x * W;
				const ly = line.y * H;
				const fs = line.size || 10;
				ctx.font = `${line.bold ? 'bold ' : ''}${fs}px "Courier New", monospace`;

				if (line.type === 'redacted') {
					ctx.fillStyle = '#1a1208';
					ctx.fillRect(lx, ly - fs, W * 0.84, fs * 1.3);
				} else if (line.type === 'visible') {
					ctx.fillStyle = '#2a2010';
					ctx.fillText(line.text, lx, ly);
				}
			});

			//  clue text ONLY if glowing (hovered)
			allClues.forEach(c => {
				if (!c.collected && c.glowing) {
					ctx.font = 'bold 10px "Courier New", monospace';
					ctx.fillStyle = '#2a2010';
					
					const words = c.text.split(' ');
					let lineText = '';
					let ly = c.py;
					words.forEach(word => {
						const test = lineText + word + ' ';
						if (ctx.measureText(test).width > c.pw && lineText !== '') {
							ctx.fillText(lineText, c.px, ly);
							lineText = word + ' ';
							ly += 14;
						} else {
							lineText = test;
						}
					});
					ctx.fillText(lineText, c.px, ly);
				} else if (c.collected) {
					ctx.font = '9px "Courier New", monospace';
					ctx.fillStyle = 'rgba(60,120,40,0.5)';
					ctx.fillText('[COLLECTED]', c.px, c.py);
				}
			});

			//  darkness mask with transparent center, flashlight effect
			const torchRadius = 190;
			const darkness = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, torchRadius);
			darkness.addColorStop(0, 'rgba(10,8,5,0)');
			darkness.addColorStop(0.68, 'rgba(10,8,5,0.1)');
			darkness.addColorStop(0.88, 'rgba(10,8,5,0.8)');
			darkness.addColorStop(1, 'rgba(10,8,5,0.97)');
			ctx.fillStyle = darkness;
			ctx.fillRect(0, 0, W, H);

			//  warm tint 
			const warmGrad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, torchRadius * 0.6);
			warmGrad.addColorStop(0, 'rgba(255,180,60,0.06)');
			warmGrad.addColorStop(1, 'rgba(255,180,60,0)');
			ctx.fillStyle = warmGrad;
			ctx.beginPath();
			ctx.arc(mouseX, mouseY, torchRadius * 0.6, 0, Math.PI * 2);
			ctx.fill();

			// Center dot 
			ctx.fillStyle = 'rgba(255,200,100,0.9)';
			ctx.beginPath();
			ctx.arc(mouseX, mouseY, 3, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = 'rgba(255,200,100,0.3)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.arc(mouseX, mouseY, 8, 0, Math.PI * 2);
			ctx.stroke();

			// near-clue glow
			nearClue = null;
			allClues.forEach(c => {
				if (c.collected) return;
				const inZone = mouseX >= c.px - 5 && mouseX <= c.px + c.pw + 5 &&
				               mouseY >= c.py - 20 && mouseY <= c.py + c.ph + 5;
				c.glowing = inZone;
				if (inZone) {
					nearClue = c;
					// Orange glow behind redactions
                    const glowGrad = ctx.createRadialGradient(
                        c.px + c.pw/2, c.py + c.ph/2, 0,
                        c.px + c.pw/2, c.py + c.ph/2, Math.max(c.pw, c.ph)
                    );
                    glowGrad.addColorStop(0, 'rgba(255,165,0,0.22)');
                    glowGrad.addColorStop(0.5, 'rgba(255,165,0,0.08)');
                    glowGrad.addColorStop(1, 'rgba(255,165,0,0)');
                    ctx.fillStyle = glowGrad;
                    ctx.fillRect(c.px - 20, c.py - 30, c.pw + 40, c.ph + 50);
				}
			});

			// appears only when hovering near an uncollected clue
			if (nearClue) {
				tooltipEl.style.display = 'block';
				tooltipEl.style.left = Math.min(mouseX + 16, W - 280) + 'px';
				tooltipEl.style.top = Math.max(mouseY - 60, 5) + 'px';
				tooltipTextEl.textContent = nearClue.text;
			} else {
				tooltipEl.style.display = 'none';
			}

			animFrame = requestAnimationFrame(draw);
		}

		draw();

		//  pointer handlers for moving the light and collecting clues
		canvas.addEventListener('mousemove', e => {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			mouseX = (e.clientX - rect.left) * scaleX;
			mouseY = (e.clientY - rect.top) * scaleY;
		});

		
		canvas.addEventListener('mouseleave', () => {
			mouseX = -500; mouseY = -500;
			tooltipEl.style.display = 'none';
		});

		canvas.addEventListener('click', () => {
			if (nearClue && !nearClue.collected) {
				nearClue.collected = true;
				collectedClues.push({ ...nearClue });
				updateFoundCounter();

				// Quick flash gives click feedback.
				const prev = { x: nearClue.px, y: nearClue.py };
				ctx.fillStyle = 'rgba(60,180,60,0.2)';
				ctx.fillRect(nearClue.px - 3, nearClue.py - 16, nearClue.pw + 6, nearClue.ph + 20);

				checkDocComplete();
			}
		});
	}

	function updateFoundCounter() {
		const total = currentDoc.docs.reduce((acc, d) => acc + d.clues.length, 0);
		foundCounter.textContent = `${collectedClues.length} / ${total} found`;
	}

	function checkDocComplete() {
		const docClues = currentDoc.docs[currentDocIdx].clues;
		const foundInDoc = collectedClues.filter(c =>
			docClues.some(dc => dc.id === c.id)
		).length;
		foundCounter.textContent = `${collectedClues.length} / ${currentDoc.docs.reduce((a, d) => a + d.clues.length, 0)} found`;

		if (foundInDoc >= docClues.length) {
			if (currentDocIdx < currentDoc.docs.length - 1) {
				nextDocBtn.style.display = 'inline-block';
			} else {
				finishBtn.style.display = 'inline-block';
			}
		} else if (currentDocIdx < currentDoc.docs.length - 1) {
			nextDocBtn.style.display = 'inline-block'; 
			//  moving on even if some clues were missed
		} else {
			finishBtn.style.display = 'inline-block';
		}
	}

	function loadDocument(docKey, docIdx) {
		const docData = documents[docKey].docs[docIdx];
		docTitleBar.textContent = docData.label;
		nextDocBtn.style.display = 'none';
		finishBtn.style.display = 'none';
		updateFoundCounter();
		if (animFrame) cancelAnimationFrame(animFrame);
		mouseX = -500; mouseY = -500;
		buildCanvas(docData);
		//  skipping after a delay so players never get stuck forever
		setTimeout(() => {
			if (currentDocIdx < currentDoc.docs.length - 1) nextDocBtn.style.display = 'inline-block';
			else finishBtn.style.display = 'inline-block';
		}, 30000);
	}

	function buildFindings() {
		const total = currentDoc.docs.reduce((acc, d) => acc + d.clues.length, 0);
		findingsSub.textContent = `${currentDoc.title} · ${collectedClues.length} of ${total} items recovered`;

		findingsList.innerHTML = collectedClues.map(c => `
			<div class="arch-finding-item">
				<div class="arch-finding-badge">RECOVERED</div>
				<div class="arch-finding-text">${c.text}</div>
			</div>
		`).join('');

		// list of missed clues so the ending reflects what stayed hidden
		const allDocClues = currentDoc.docs.flatMap(d => d.clues);
		const missed = allDocClues.filter(c => !collectedClues.some(cc => cc.id === c.id));
		if (missed.length > 0) {
			missedList.innerHTML = `
				<div class="arch-missed-label">Still buried (${missed.length} not found):</div>
				${missed.map(c => `<div class="arch-finding-item missed"><div class="arch-finding-badge missed">NOT FOUND</div><div class="arch-finding-text">${c.text}</div></div>`).join('')}
			`;
		} else {
			missedList.innerHTML = `<div class="arch-missed-label" style="color:rgba(60,160,80,0.7)">You found everything. Most archives do not give you that option.</div>`;
		}

		findingsRefl.innerHTML = `<p>${currentDoc.reflection}</p>`;
	}

	// document select, next, finish, restart, and close.

	modal.querySelectorAll('.archive-game-doc-card').forEach(card => {
		card.addEventListener('click', () => {
			const key = card.dataset.doc;
			currentDoc = documents[key];
			currentDocIdx = 0;
			collectedClues = [];
			showScreen(gameScreen);
			loadDocument(key, 0);
		});
	});

	nextDocBtn.addEventListener('click', () => {
		currentDocIdx++;
		if (animFrame) cancelAnimationFrame(animFrame);
		loadDocument(Object.keys(documents).find(k => documents[k] === currentDoc), currentDocIdx);
		nextDocBtn.style.display = 'none';
	});

	finishBtn.addEventListener('click', () => {
		if (animFrame) cancelAnimationFrame(animFrame);
		buildFindings();
		showScreen(findingsScreen);
	});

	modal.querySelector('#arch-restart-btn').addEventListener('click', () => {
		if (animFrame) cancelAnimationFrame(animFrame);
		currentDoc = null;
		currentDocIdx = 0;
		collectedClues = [];
		showScreen(introScreen);
	});

	modal.querySelector('.archive-game-close').addEventListener('click', () => {
		if (animFrame) cancelAnimationFrame(animFrame);
		modal.remove();
	});

	// escape closes and stops animation so nothing keeps running in the background
	window.addEventListener('keydown', e => {
		if (e.key === 'Escape') {
			if (animFrame) cancelAnimationFrame(animFrame);
			modal.remove();
		}
	}, { once: true });
}

// each quiz/game button ID maps to the correct modal 
document.querySelectorAll('.quiz-button').forEach(btn => {
	btn.addEventListener('click', function() {
		const id = this.getAttribute('id');
		if (id === 'quiz-button') {
			const section = this.getAttribute('data-section') || 'prisons';
			openLearnCardsModal(section);
		} else if (id === 'quiz-button2') {
			openCaseFileModal();
		} else if (id === 'quiz-button3') {
			openDayInLifeModal();
		} else if (id === 'game-button') {
			const section = this.getAttribute('data-section') || window.location.pathname.toLowerCase();
			if (section.includes('books')) {
				openBooksGame();
			} else if (section.includes('empires')) {
				openEmpiresGame();
			} else if (section.includes('archive')) {
				openArchiveGame();
			} else if (section.includes('tech')) {
				openTechGame();
			}
		}
	});
});
}); 



