/* 

This is a sample AI which does nothing but start a practice game,
then repeatedly try to plant a bomb until the game is complete.

The C++ standard library does not include HTTP or JSON functionality.
This file makes use of two libraries: 
	libcurl (actually a C library)
	JSON for Modern C++
Make sure to include the two!
Remember to compile using -lcurl to link the curl library  
Additionally, compile using at least C++11 for json.h 

Lastly, replace the two #defines with your own information

*/

#include <sys/select.h>
#include <string>
#include <fstream>
#include "curl/curl.h"
#include "json.h"
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

#include <curl/curl.h>


#define DEV_KEY "[dev key]" 	// REPLACE WITH YOUR DEV KEY
#define USERNAME "[username]"	// REPLACE WITH YOUR USERNAME
 
using json = nlohmann::json;
 
static size_t WriteCallback(void *contents, size_t size, size_t nmemb, void *userp)
{
    ((std::string*)userp)->append((char*)contents, size * nmemb);
    return size * nmemb;
}

static void StartPracticeGame(json* j)
{
	CURL* curl;
	CURLcode res;
	std::string read_buffer;
	std::string post_fields = "devkey=" DEV_KEY "&username=" USERNAME;

	curl = curl_easy_init();
	if (curl) {
		curl_easy_setopt(curl, CURLOPT_URL, "http://aicomp.io/api/games/practice");
		curl_easy_setopt(curl, CURLOPT_POSTFIELDS, post_fields.c_str());

		curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
		curl_easy_setopt(curl, CURLOPT_WRITEDATA, &read_buffer);
		res = curl_easy_perform(curl);

		if (res != CURLE_OK) {
			std::cout << "curl_easy_perform() failed: " << curl_easy_strerror(res) << std::endl;
		}

		*j = json::parse(read_buffer);
	}

	curl_easy_cleanup(curl);

}

static void PostBombMove(json* j)
{
	CURL* curl;
	CURLcode res;
	std::string read_buffer;

	std::string url = "http://aicomp.io/api/games/submit/";
	url += (*j)["gameID"].get<std::string>();

	std::string data = "devkey=" DEV_KEY "&playerID=";
	data += (*j)["playerID"].get<std::string>();
	data += "&move=b";


	curl = curl_easy_init();
	if (curl) {
		curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
		curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data.c_str());

		curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
		curl_easy_setopt(curl, CURLOPT_WRITEDATA, &read_buffer);
		res = curl_easy_perform(curl);

		if (res != CURLE_OK) {
			std::cout << "curl_easy_perform() failed: " << curl_easy_strerror(res) << std::endl;
		}

		*j = json::parse(read_buffer);

		std::cout << j->dump(4) << std::endl;
	}

	curl_easy_cleanup(curl);
}

int main(void)
{
	json j;
	StartPracticeGame(&j);
	std::cout << j.dump(4) << std::endl;

	while ( j["state"].get<std::string>() != "complete" ) {
		std::cout << "Action: PostBombMove()" << std::endl;
		PostBombMove(&j);
		std::cout << j.dump(4) << std::endl;
	}
	
	std::cout << "\n\n\nFinished" << std::endl;


	return 0;
}