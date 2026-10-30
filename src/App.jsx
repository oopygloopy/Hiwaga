import './App.css'
import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase } from './utils/supabase'
import hiwagaLogo from './assets/hiwagalogo.png'
import facebookIcon from './assets/fb-icon.png'
import youtubeIcon from './assets/yt-icon.png'
import einsteinLogo from './assets/einsteinlogo.png'
import crossedSwordsIcon from './assets/crossedswords.svg'
import schoolIcon from './assets/school.svg'
import chartIcon from './assets/chart.svg'
import gamePreview from './assets/game-preview.png'

const Overview = lazy(() => import('./Overview.jsx'))
const MAX_LOGIN_ATTEMPTS = 5

function App() {
  const [session, setSession] = useState(null)
  const [pendingSession, setPendingSession] = useState(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isNavOpen, setIsNavOpen] = useState(false)

  useEffect(() => {
    if (!isNavOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsNavOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isNavOpen])

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setPendingSession(session)
        setIsCheckingSession(Boolean(session))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setSession(null)
        setPendingSession(null)
        setIsCheckingSession(false)
        setEmail('')
        setPassword('')
        setShowPassword(false)
        return
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        setSession(null)
        setPendingSession(session)
        setIsCheckingSession(true)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const closeLogin = () => {
    setIsLoginOpen(false)
    setShowPassword(false)
  }

  useEffect(() => {
    if (!pendingSession) return undefined

    let isCurrent = true

    const verifyRole = async () => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('uuid', pendingSession.user.id)
        .maybeSingle()

      if (!isCurrent) return

      const role = String(profile?.role ?? '').trim().toLowerCase()

      if (profileError || !profile || role === 'student') {
        setError(profileError || !profile
          ? 'Unable to verify account access. Please try again.'
          : 'Student accounts cannot access this website.')
        setSession(null)
        setPendingSession(null)
        setIsCheckingSession(false)
        await supabase.auth.signOut()
        return
      }

      setSession(pendingSession)
      setPendingSession(null)
      setIsCheckingSession(false)
      closeLogin()
    }

    verifyRole()

    return () => {
      isCurrent = false
    }
  }, [pendingSession])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isLoading || failedAttempts >= MAX_LOGIN_ATTEMPTS) return

    setError('')
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const nextFailedAttempts = failedAttempts + 1
      setFailedAttempts(nextFailedAttempts)
      setError(nextFailedAttempts >= MAX_LOGIN_ATTEMPTS
        ? 'Too many failed attempts. Login is locked for this session.'
        : 'Invalid email or password.')
    } else {
      setFailedAttempts(0)
    }

    setIsLoading(false)
  }

  if (session) {
    return (
      <Suspense fallback={<main className="dashboard-page" aria-busy="true">Loading dashboard...</main>}>
        <Overview user={session.user} />
      </Suspense>
    )
  }

  if (isCheckingSession) {
    return <main className="dashboard-page" aria-busy="true">Checking account access...</main>
  }

  return (
    <main className="welcome-page">
      <header className="welcome-toolbar">
        <div className="welcome-toolbar-brand">
          <a
            href="https://little-einstein.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="Little Einstein Discovery School website"
          >
            <img className="welcome-school-icon" src={einsteinLogo} alt="Little Einstein Discovery School" />
          </a>
          <button
            className={`mobile-nav-toggle ${isNavOpen ? 'is-open' : ''}`}
            type="button"
            aria-label={isNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen((prev) => !prev)}
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </button>
        </div>
        <div className={`welcome-nav-menu ${isNavOpen ? 'is-open' : ''}`}>
          <nav className="welcome-navigation" aria-label="Main navigation">
            <a href="#home" onClick={() => setIsNavOpen(false)}>Home</a>
            <a href="#about" onClick={() => setIsNavOpen(false)}>About</a>
            <a href="#faq" onClick={() => setIsNavOpen(false)}>FAQ</a>
            <a href="#contact" onClick={() => setIsNavOpen(false)}>Contact</a>
          </nav>
          <button
            className="login-trigger"
            type="button"
            onClick={() => {
              setIsNavOpen(false)
              setIsLoginOpen(true)
            }}
          >
            Login
          </button>
        </div>
      </header>

      <section className="welcome-section home-section" id="home" aria-labelledby="welcome-title">
        <div className="welcome-panel">
          <h1 id="welcome-title" className="home-title">
            <img src={hiwagaLogo} alt="Hiwaga" />
          </h1>
          <div className="home-glass-card">
            <p className="welcome-kicker">A journey through Philippine history</p>
            <p className="welcome-description">
              Venture through the world of "Hiwaga", and learn about the history of the Philippines through an immersive world and engaging turn-based gameplay. Battle through time against enemies using the power of knowledge!
            </p>
          </div>
          <a
            className="home-download-btn"
            href="https://media.githubusercontent.com/media/oopygloopy/Hiwaga/main/public/downloads/HIWAGA.apk"
            download="HIWAGA.apk"
          >
            Download the Game
          </a>
        </div>
      </section>

      <section className="welcome-section info-section about-section" id="about" aria-labelledby="about-title">
        <div className="about-hero-layout">
          <div className="about-text-content">
            <p className="welcome-kicker">The story behind the adventure</p>
            <h2 id="about-title">About Hiwaga</h2>
            <p>
              Hiwaga is an educational mobile RPG made by 4 IT students in collaboration with Little Einstein Discovery School. Our goal is to provide a replayable and interactive game with an engaging story that teaches Grade 5 students about social studies.
            </p>
            <p>
              Within this website, a teacher can log in, monitor student progress, review game quiz scores, track student improvements, and manage student accounts.
            </p>
          </div>

          <div className="about-media-showcase">
            <img
              className="about-preview-image"
              src={gamePreview}
              alt="Hiwaga game preview"
            />
          </div>
        </div>

        <div className="about-pillars-grid">
          <div className="about-pillar-item">
            <img className="pillar-image" src={crossedSwordsIcon} alt="" aria-hidden="true" />
            <div className="pillar-text">
              <h3>Gamified Learning</h3>
              <p>Students journey through Philippine history, engaging in turn-based combat using the power of knowledge.</p>
            </div>
          </div>
          <div className="about-pillar-item">
            <img className="pillar-image" src={schoolIcon} alt="" aria-hidden="true" />
            <div className="pillar-text">
              <h3>School Partnership</h3>
              <p>Made with direct collaboration with teachers at Little Einstein Discovery School to align with Grade 5 Araling Panlipunan.</p>
            </div>
          </div>
          <div className="about-pillar-item">
            <img className="pillar-image" src={chartIcon} alt="" aria-hidden="true" />
            <div className="pillar-text">
              <h3>Teacher Monitoring</h3>
              <p>Provides teachers with the tools to track the growth of any students playing Hiwaga through their scores within the game.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="welcome-section info-section faq-section" id="faq" aria-labelledby="faq-title">
        <p className="welcome-kicker">Good to know</p>
        <h2 id="faq-title">Frequently asked questions</h2>
        <details>
          <summary>What is this website for?</summary>
          <p>This website is where students can download the game, and where teachers can log in and view student records within the game.</p>
        </details>
        <details>
          <summary>How can I access the website or game?</summary>
          <p>Hiwaga as a whole is designed for the exclusive use of staff and students within Little Einstein Discovery School and staff are the only ones that can make user accounts.</p>
        </details>
        <details>
          <summary>Why can't I access the website as a student?</summary>
          <p>The website is designed for the use of teachers only, students cannot access the website as they contain the data of other students.</p>
        </details>
        <details>
          <summary>What can I do if I forgot my credentials for my student account?</summary>
          <p>Contact a teacher with access to the website and ask them to change your user student credentials.</p>
        </details>
      </section>

      <section className="welcome-section info-section contact-section" id="contact" aria-labelledby="contact-title">
        <p className="welcome-kicker">Stay connected</p>
        <h2 id="contact-title">Contact the school</h2>
        <p>Read our news feed, blog and social media to keep informed on news about the school as it is happening.</p>
        <p className="contact-find-us">Find us at:</p>
        <div className="contact-social-links">
          <a href="https://www.facebook.com/LittleEinsteinDiscoverySchool/" target="_blank" rel="noreferrer" aria-label="Little Einstein Discovery School on Facebook">
            <img src={facebookIcon} alt="" />
          </a>
          <a href="https://www.youtube.com/channel/UCjhx_lSDb7HrS83KP7kwDeg" target="_blank" rel="noreferrer" aria-label="Little Einstein Discovery School on YouTube">
            <img src={youtubeIcon} alt="" />
          </a>
        </div>
        <p className="contact-find-us">Visit us at:</p>
        <address className="contact-address">
          101 Gen. Luna St., Brgy. 18, Caloocan City<br />
          (02) 8356-7990<br />
          registrar@little-einstein.com
        </address>
        <iframe
          className="contact-map"
          title="Map to Little Einstein Discovery School of Caloocan"
          src="https://www.google.com/maps?q=Little+Einstein+Discovery+School+of+Caloocan&output=embed"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </section>

      <footer className="welcome-footer">
        <p>© 2026 Hiwaga. All rights reserved. Made for Little Einstein Discovery School of Caloocan</p>
      </footer>

      {isLoginOpen && (
        <div
          className="login-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isLoading) closeLogin()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isLoading) closeLogin()
          }}
        >
          <section className="login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title">
            <header className="login-dialog-header">
              <div>
                <h2 id="login-title">Login Portal</h2>
                <p>Sign in to see the Hiwaga dashboard.</p>
              </div>
              <button
                className="login-close"
                type="button"
                aria-label="Close login dialog"
                disabled={isLoading}
                onClick={closeLogin}
              >
                ×
              </button>
            </header>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="field-group">
                <label htmlFor="email">Teacher Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  disabled={failedAttempts >= MAX_LOGIN_ATTEMPTS}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="password">Password</label>
                <div className="password-field-wrapper">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    disabled={failedAttempts >= MAX_LOGIN_ATTEMPTS}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="show-password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    disabled={failedAttempts >= MAX_LOGIN_ATTEMPTS}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                        <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                        <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
                        <path d="m2 2 20 20" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && <p className="login-error" role="alert">{error}</p>}

              <button type="submit" disabled={isLoading || failedAttempts >= MAX_LOGIN_ATTEMPTS}>
                {isLoading ? 'Signing in...' : failedAttempts >= MAX_LOGIN_ATTEMPTS ? 'Locked' : 'Login'}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
