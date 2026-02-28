import PageLayout from "../components/layout/PageLayout";
import { Sparkles, Bot, ArrowUp } from "lucide-react";

export default function AIAdvisor() {

  return (

    <PageLayout
      title=""
      description=""
    >

      <div className="bg-white border rounded-xl h-[650px] flex flex-col justify-between">


        {/* Header */}

        <div className="p-6 border-b">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 bg-green-600 text-white flex items-center justify-center rounded-lg">

              <Sparkles size={18} />

            </div>

            <div>

              <div className="font-semibold">

                AI Advisor

              </div>

              <div className="text-sm text-gray-500 flex items-center gap-2">

                <span className="w-2 h-2 bg-green-500 rounded-full"></span>

                Gemini 2.5 Flash Connected

              </div>

            </div>

          </div>

        </div>



        {/* Chat Area */}

        <div className="flex-1 p-6">


          <div className="flex gap-3">

            <div className="w-9 h-9 bg-green-100 text-green-600 flex items-center justify-center rounded-full">

              <Bot size={18} />

            </div>


            <div>

              <div className="bg-gray-100 px-4 py-3 rounded-xl text-sm max-w-xl">

                Hello. I am **AI**. I can analyze your portfolio,
                predict carbon price trends, or suggest offsetting strategies.
                How can I help?

              </div>

              <div className="text-xs text-gray-400 mt-1">

                AI Assistant

              </div>

            </div>


          </div>


        </div>



        {/* Bottom Input */}

        <div className="p-6 border-t space-y-3">


          {/* Input */}

          <div className="flex items-center bg-gray-100 rounded-xl px-4 py-3">

            <input
              className="flex-1 bg-transparent outline-none text-sm"
              placeholder="Ask about your emissions or market trends..."
            />

            <button className="bg-gray-400 text-white p-2 rounded-lg">

              <ArrowUp size={16} />

            </button>

          </div>



          {/* Suggestions */}

          <div className="flex gap-2 flex-wrap">

            <button className="px-3 py-1 bg-gray-100 rounded-full text-sm">

              Reducing Scope 3 emissions

            </button>

            <button className="px-3 py-1 bg-gray-100 rounded-full text-sm">

              Forestry credit trends

            </button>

            <button className="px-3 py-1 bg-gray-100 rounded-full text-sm">

              Explanation of "Vintage"

            </button>

          </div>


        </div>


      </div>


    </PageLayout>

  );

}
