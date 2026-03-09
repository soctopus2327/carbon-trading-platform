import PageLayout from "../components/layout/PageLayout";
import { Sparkles, Bot, ArrowUp } from "lucide-react";

type AIAdvisorProps = {
  onLogout?: () => void;
};

export default function AIAdvisor({ onLogout: _onLogout }: AIAdvisorProps) {

  return (

    <PageLayout
      title="AI Advisor"
      description="Get intelligent recommendations for your carbon portfolio"
    >

      <div className="bg-white border border-gray-100 rounded-xl h-[650px] flex flex-col justify-between shadow-md">


        {/* Header */}

        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 text-white flex items-center justify-center rounded-lg shadow-md">

              <Sparkles size={20} />

            </div>

            <div>

              <div className="font-bold text-lg text-gray-900">

                AI Advisor

              </div>

              <div className="text-sm text-gray-600 flex items-center gap-2">

                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>

                Gemini 2.5 Flash Connected

              </div>

            </div>

          </div>

        </div>



        {/* Chat Area */}

        <div className="flex-1 p-6 bg-gray-50 overflow-y-auto">


          <div className="flex gap-3">

            <div className="w-10 h-10 bg-green-100 text-green-600 flex items-center justify-center rounded-full flex-shrink-0">

              <Bot size={20} />

            </div>


            <div>

              <div className="bg-white border border-gray-200 px-4 py-3 rounded-xl text-sm max-w-xl shadow-sm">

                Hello! I'm your AI Assistant. I can analyze your carbon portfolio,
                predict market trends, and suggest offsetting strategies.
                **How can I help you today?**

              </div>

              <div className="text-xs text-gray-500 mt-2">

                AI Assistant

              </div>

            </div>


          </div>


        </div>



        {/* Bottom Input */}

        <div className="p-6 border-t border-gray-200 bg-white space-y-3">


          {/* Input */}

          <div className="flex items-center bg-gray-100 rounded-xl px-4 py-3 border-2 border-gray-200 focus-within:border-green-500 transition">

            <input
              className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500"
              placeholder="Ask about emissions, market trends, or strategies..."
            />

            <button className="bg-gradient-to-r from-green-600 to-green-700 text-white p-2 rounded-lg hover:from-green-700 hover:to-green-800 transition ml-2">

              <ArrowUp size={18} />

            </button>

          </div>



          {/* Suggestions */}

          <div className="flex gap-2 flex-wrap">

            <button className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium hover:bg-green-100 transition border border-green-200">

              Reducing Scope 3 emissions

            </button>

            <button className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium hover:bg-green-100 transition border border-green-200">

              Forestry credit trends

            </button>

            <button className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium hover:bg-green-100 transition border border-green-200">

              Explanation of "Vintage"

            </button>

          </div>


        </div>


      </div>


    </PageLayout>

  );

}
