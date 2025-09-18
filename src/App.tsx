import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="clock-container">
      <div className="clock">
        <h1>{time.toLocaleTimeString()}</h1>
        <p>{time.toLocaleDateString()}</p>
      </div>
    </div>
  )
}

export default App