import { useState } from "react";
import {
	ArrowPathIcon,
	CheckCircleIcon,
	ClipboardIcon,
	ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { z } from "zod";

interface ApiResponse {
	shortCode: string;
	shortUrl: string;
	originalUrl: string;
	expiresAt?: string;
}

const urlSchema = z.object({
	url: z
		.string()
		.min(1, "URL é obrigatória")
		.url("URL inválida")
		.regex(/^https?:\/\//, "URL deve começar com http:// ou https://"),
});

type FormErrors = {
	[key: string]: string[];
};

export function UrlShortener() {
	const [url, setUrl] = useState("");
	const [shortUrl, setShortUrl] = useState("");
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<FormErrors>({});
	const [copied, setCopied] = useState(false);

	const API_URL = import.meta.env.VITE_API_URL;

	const validateForm = (): boolean => {
		try {
			urlSchema.parse({ url });
			setErrors({});
			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				const formattedErrors: FormErrors = {};

				for (const err of error.errors) {
					const field = err.path[0].toString();
					if (!formattedErrors[field]) {
						formattedErrors[field] = [];
					}
					formattedErrors[field].push(err.message);
				}

				setErrors(formattedErrors);
			}
			return false;
		}
	};

	const shortenUrl = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setLoading(true);
		setErrors({});
		setCopied(false);

		try {
			const response = await fetch(`${API_URL}/shorten`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ originalUrl: url }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Erro ao encurtar URL");
			}

			const data: ApiResponse = await response.json();
			setShortUrl(data.shortUrl);
			setUrl("");
		} catch (error) {
			setErrors({
				submit: [
					error instanceof Error ? error.message : "Erro ao encurtar URL",
				],
			});
		} finally {
			setLoading(false);
		}
	};

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(shortUrl);
			setCopied(true);
			setTimeout(() => {
				setCopied(false);
			}, 2000);
		} catch {
			setErrors({
				clipboard: ["Erro ao copiar para a área de transferência"],
			});
			setTimeout(() => {
				setErrors((prev) => {
					const { clipboard: _, ...rest } = prev;
					return rest;
				});
			}, 3000);
		}
	};

	return (
		<div className="max-w-xl mx-auto">
			<form onSubmit={shortenUrl} className="space-y-4" noValidate>
				<div className="flex flex-col sm:flex-row gap-2">
					<div className="relative flex-grow">
						<input
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="Coloque sua URL longa aqui..."
							className={`w-full px-6 py-4 pr-36 
      border-l border-r border-t border-b rounded-l-md ${
				errors.url
					? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-950/50"
					: "border-gray-200 dark:border-gray-700"
			}
      focus:border-blue-500 dark:focus:border-blue-400
      focus:outline-none focus:ring-[1px] focus:ring-blue-500 dark:focus:ring-blue-400
      text-gray-900 dark:text-gray-100
      placeholder-gray-500 dark:placeholder-gray-300
      transition-all bg-white dark:bg-gray-900`}
							aria-invalid={errors.url ? "true" : "false"}
							aria-describedby={errors.url ? "url-error" : undefined}
						/>
						{errors.url && (
							<div className="absolute right-48 top-1/2 -translate-y-1/2">
								<ExclamationCircleIcon className="h-5 w-5 text-red-500 dark:text-red-400" />
							</div>
						)}
						<button
							type="submit"
							disabled={loading}
							className="absolute right-0 top-0 h-full px-8 
      bg-blue-600 dark:bg-blue-500 rounded-r-md 
      text-white 
      hover:bg-blue-700 dark:hover:bg-blue-600 
      focus:outline-none focus:ring-1 
      focus:ring-blue-500 dark:focus:ring-blue-400 
      focus:ring-offset-2 dark:focus:ring-offset-gray-900 
      disabled:opacity-50 
      transition-colors font-medium"
						>
							{loading ? (
								<ArrowPathIcon className="h-5 w-5 animate-spin" />
							) : (
								<>Encurtar</>
							)}
						</button>
					</div>
				</div>

				{(errors.url || errors.submit) && (
					<div
						className="rounded-lg bg-red-50 dark:bg-red-950/50 p-4 
    transition-all duration-300 animate-slideIn"
						role="alert"
					>
						<div className="flex">
							<ExclamationCircleIcon className="h-5 w-5 text-red-400 mt-0.5" />
							<div className="ml-3">
								<h3 className="text-sm font-medium text-red-800 dark:text-red-200">
									{errors.submit ? "Erro ao encurtar URL" : "Erro de validação"}
								</h3>
								<div className="mt-1 text-sm text-red-700 dark:text-red-300">
									{errors.url?.map((error) => (
										<p key={`url-error-${error}`}>{error}</p>
									))}
									{errors.submit?.map((error) => (
										<p key={`submit-error-${error}`}>{error}</p>
									))}
								</div>
							</div>
						</div>
					</div>
				)}
			</form>

			{shortUrl && (
				<div className="mt-6 p-4 bg-green-50 dark:bg-green-950/50 rounded-lg animate-fadeIn">
					<div className="flex items-center">
						<CheckCircleIcon className="h-5 w-5 text-green-400" />
						<p className="ml-2 text-sm text-gray-600 dark:text-gray-300">
							URL encurtada com sucesso!
						</p>
					</div>
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-3">
						<a
							href={shortUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-600 dark:text-blue-400 hover:underline break-all flex-grow font-medium"
						>
							{shortUrl}
						</a>
						<button
							type="button"
							onClick={copyToClipboard}
							className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium 
        text-gray-700 dark:text-gray-200 
        bg-white dark:bg-gray-800 
        rounded-md 
        hover:bg-gray-50 dark:hover:bg-gray-700 
        focus:outline-none focus:ring-2 
        focus:ring-offset-2 dark:focus:ring-offset-gray-900 
        focus:ring-blue-500 dark:focus:ring-blue-400 
        transition-colors shadow-sm 
        border border-gray-200 dark:border-gray-700"
							title="Copiar para área de transferência"
						>
							{copied ? (
								<>
									<CheckCircleIcon className="h-5 w-5 text-green-500 dark:text-green-400" />
									<span>Copiado!</span>
								</>
							) : (
								<>
									<ClipboardIcon className="h-5 w-5" />
									<span>Copiar</span>
								</>
							)}
						</button>
					</div>
				</div>
			)}

			{errors.clipboard && (
				<div
					className="mt-2 rounded-lg bg-red-50 dark:bg-red-950/50 p-3 
  transition-all duration-300 animate-slideIn"
				>
					<div className="flex items-center">
						<ExclamationCircleIcon className="h-5 w-5 text-red-400" />
						<p className="ml-2 text-sm text-red-700 dark:text-red-300">
							{errors.clipboard[0]}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
