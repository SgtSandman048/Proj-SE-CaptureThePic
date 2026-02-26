import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    // ส่วนนี้เช็ค Tailwind: ถ้าพื้นหลังเป็นสีฟ้าอ่อน แสดงว่า Tailwind ทำงานปกติ
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          React + Tailwind! 🚀
        </h1>
        
        <p className="text-gray-600 mb-6">
          ถ้าคุณเห็นปุ่มสีน้ำเงินและดีไซน์สวยๆ แบบนี้ แสดงว่าติดตั้งสำเร็จแล้วครับ
        </p>

        {/* ส่วนนี้เช็ค React Logic: ถ้ากดแล้วเลขเปลี่ยน แสดงว่า React ทำงานปกติ */}
        <div className="space-y-4">
          <p className="text-2xl font-mono font-bold text-slate-800">
            Count is: {count}
          </p>
          
          <button
            onClick={() => setCount(count + 1)}
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            ลองกดปุ่มนี้ดูครับ
          </button>
        </div>

        <p className="mt-6 text-sm text-gray-400">
          Edit <code>src/App.jsx</code> to start building.
        </p>
      </div>

    </div>
  )
}

export default App