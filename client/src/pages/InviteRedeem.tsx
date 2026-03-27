import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";

export function InviteRedeem() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const redeemMutation = trpc.invites.redeem.useMutation();
  const checkStatusQuery = trpc.invites.checkStatus.useQuery();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token de convite inválido");
      return;
    }

    // Se o usuário já está autorizado, redirecionar
    if (checkStatusQuery.data?.authorized) {
      navigate("/dashboard");
      return;
    }

    // Tentar resgatar o convite
    const redeem = async () => {
      try {
        await redeemMutation.mutateAsync({ token });
        setStatus("success");
        setMessage("Acesso liberado com sucesso! Redirecionando...");
        setTimeout(() => navigate("/dashboard"), 2000);
      } catch (error: any) {
        setStatus("error");
        setMessage(error.message || "Erro ao processar convite");
      }
    };

    redeem();
  }, [token, checkStatusQuery.data?.authorized, navigate, redeemMutation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <Loader className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold mb-2">Processando Convite</h1>
            <p className="text-gray-600">Aguarde um momento...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-green-600">Bem-vindo!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecionando para o dashboard...</p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-red-600">Acesso Negado</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate("/")}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition"
            >
              Voltar para Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
