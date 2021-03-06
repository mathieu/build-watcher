module Common exposing (..)

import Json.Decode exposing (..)


type Status
    = Unknown
    | Building
    | Green
    | Red


type alias BuildResult =
    { url : String
    , status : Status
    , name : String
    }


stringOrEmpty : String -> Decoder String
stringOrEmpty f =
    oneOf
        [ field f string
        , succeed ""
        ]


validateRequired : String -> Maybe String
validateRequired s =
    if String.isEmpty s then
        Just "This field is required"
    else
        Nothing


split : Int -> List a -> List (List a)
split i list =
  case List.take i list of
    [] -> []
    listHead -> listHead :: split i (List.drop i list)
