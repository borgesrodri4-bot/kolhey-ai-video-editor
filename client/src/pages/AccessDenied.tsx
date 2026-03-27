import React from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

export function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <Lock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Acesso Restrito</h1>
        <p className="text-gray-600 mb-6">
          Esta plataforma é privada. Você precisa de um convite para acessar.
        </p>
        <div className="bg-orange-50 border border-orange-200 rounded-md p-4 mb-6">
          <p className="text-sm text-gray-700">
            Se você recebeu um link de convite, clique nele para ganhar acesso permanente.
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md transition w-full"
        >
          Voltar para Home
        </button>
      </div>
    </div>
  );
}
