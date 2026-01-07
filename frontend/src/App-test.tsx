import { useState } from 'react';
import { Plus } from 'lucide-react';

// Minimal test to see if React is working
function App() {
    const [count, setCount] = useState(0);

    return (
        <div className="h-screen w-screen bg-zinc-950 text-white flex items-center justify-center flex-col gap-4">
            <h1 className="text-4xl font-bold">KhojSetu Test</h1>
            <p className="text-xl">Count: {count}</p>
            <button
                onClick={() => setCount(count + 1)}
                className="px-6 py-3 bg-violet-600 rounded-lg hover:bg-violet-700"
            >
                Click Me
            </button>
            <Plus className="w-8 h-8 text-green-500" />
            <div className="text-sm text-gray-400">If you see this, React is working</div>
        </div>
    );
}

export default App;
